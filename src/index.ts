import { config } from "dotenv";
config();
import { v4 as uuidv4 } from "uuid";

const express = require("express");
const axios = require("axios");
const qs = require("qs");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 4000;

const client_Id = process.env.ZOOM_CLIENT_ID!;
const client_Secret = process.env.ZOOM_CLIENT_SECRET!;
const redirect_uri = process.env.ZOOM_REDIRECT_URI!;
const create_Meeting_Url = process.env.ZOOM_CREATE_MEETING_URL;
const zoomApiUrl = process.env.ZOOM_API_URL;
const zoomTokenURL = process.env.ZOOM_TOKEN_URL;
const state = uuidv4();
let accessToken = "";

app.use(express.json());
app.use(cors());

app.post("/api/get-tokens", async (req, res) => {
  const code = req.body.code;

  if (code) {
    try {
      const zoom_Token_Url = process.env.ZOOM_TOKEN_URL; // Replace with Zoom's token endpoint URL

      const data = qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect_uri,
        client_id: client_Id,
        client_secret: client_Secret, // Never send client secret directly in the request body
      });

      const response = await axios.post(zoom_Token_Url, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded", // Required for POST with form data
        },
      });
      console.log(response);
      const accessToken = response.data.access_token;
      res.json({ accessToken });
    } catch (error) {
      console.error("Error obtaining tokens:", error);
      if (error.response) {
        const { status, data } = error.response;
        res.status(status).json({ error: data.error }); // Send more informative error message
      } else {
        res.status(500).json({ error: "Internal server error" }); // Generic error for unexpected issues
      }
    }
  } else {
    res.status(400).json({ error: "Missing authorization code" });
  }
});

app.post("/api/create-meeting", async (req, res) => {
  accessToken = req.headers.authorization?.split(" ")[1];
  const {
    topic,
    start_time,
    duration,
    agenda,
    participants,
    participantEmails,
  } = req.body;
  console.log(req.body);
  if (accessToken && topic && start_time && duration) {
    try {
      // Meeting settings
      const settings = {
        host_video: true,
        participant_video: true,        
        join_before_host: true, // Allow participants to join before host
        mute_upon_entry: true,
        approval_type: 2, // 0 - Automatically approve, 1 - Manually approve, 2 - No registration required
        audio: "both", // 'both', 'telephony', 'voip'
        auto_recording: "local", // 'local', 'cloud', 'none'
        // alternative_hosts: "david@intoaec.com", // Comma separated emails of alternative hosts
        waiting_room: true, // Enable waiting room,
      };

      const response = await axios.post(
        create_Meeting_Url,
        {
          topic,
          start_time,
          duration,
          agenda,
          settings: {            
            ...settings
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const meeting = response.data;
      console.log("Meeting created:", meeting);

      // await addParticipant(meeting.id, participants, accessToken);

      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).send("Error creating meeting");
    }
  } else {
    res.status(400).send("Missing access token or meeting details");
  }
});

const addParticipant = async (meetingId, participants, accessToken) => {
  try {
    const registrationPromises = participants.map(async (participant) => {
      const { email, name } = participant;

      const response = await axios.post(
        `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
        {
          email,
          first_name: name, // Assuming 'name' is the first name
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`Registration successful for ${email}`);
    });

    await Promise.all(registrationPromises);
    console.log("All participants registered successfully!");
  } catch (error) {
    console.error("Error registering participants:", error.response.data);
  }
};

app.patch("/api/edit-meeting/:meetingId", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract token from authorization header
  const meetingId = req.params.meetingId;
  const updatedMeetingDetails = req.body;

  if (accessToken && meetingId && updatedMeetingDetails) {
    try {
      const response = await axios.patch(
        `${zoomApiUrl}${meetingId}`,
        updatedMeetingDetails,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json(response.data);
      console.log(response.data);
    } catch (error) {
      console.error(
        "Error updating meeting:",
        error.response?.data || error.message
      );
      res.status(500).send("Error updating meeting");
    }
  } else {
    res
      .status(400)
      .send("Missing access token, meeting ID, or updated meeting details");
  }
});

app.delete("/api/delete-meeting/:meetingId", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract token from authorization header
  const meetingId = req.params.meetingId;

  if (accessToken && meetingId) {
    try {
      await axios.delete(`${zoomApiUrl}${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      res.status(204).send(); // 204 No Content indicates successful deletion
    } catch (error) {
      console.error(
        "Error deleting meeting:",
        error.response?.data || error.message
      );
      res.status(500).send("Error deleting meeting");
    }
  } else {
    res.status(400).send("Missing access token or meeting ID");
  }
});

app.get("/api/get-meeting/:meetingId", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract token from authorization header
  const meetingId = req.params.meetingId;

  if (accessToken && meetingId) {
    try {
      const response = await axios.get(`${zoomApiUrl}${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      res.send(response.data); // 204 No Content indicates successful deletion
    } catch (error) {
      console.error(
        "Error fetching meeting:",
        error.response?.data || error.message
      );
      res.status(500).send("Error fetching meeting");
    }
  } else {
    res.status(400).send("Missing access token or meeting ID");
  }
});

app.get("/auth/zoom", (req, res) => {
  // console.log(client_Id);
  // console.log(client_Secret);
  // console.log(redirect_uri);
  const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${client_Id}&redirect_uri=${redirect_uri}&state=${state}`;
  res.redirect(zoomAuthUrl);
});

app.get("/auth/zoom/callback", async (req, res) => {
  const authorizationCode = req.query.code as string;
  console.log(authorizationCode);
  try {
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: redirect_uri,
      },
      auth: {
        username: client_Id,
        password: client_Secret,
      },
    });

    accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;
    console.log(response);
    res.redirect(
      `http://localhost:3000/?access_token=${accessToken}&refresh_Token=${refreshToken}`
      // `http://localhost:3000/refrestoken?access_token=${accessToken}&refresh_Token=${refreshToken}`
    );
    //res.send(`Access Token: ${accessToken}`);
  } catch (error) {
    res.status(500).send(`Error: ${error.response?.data || error.message}`);
  }
});
app.get("/api/refresh-token", async (req, res) => {
  const refreshToken = req.headers.authorization?.split(" ")[1];
  const response = await refreshOauthToken({ old_refresh_token: refreshToken });
  console.log("refreshtoken " + response);
  res.status(200).json(response);
});

const refreshOauthToken = async ({ old_refresh_token }) => {
  try {
    const zoomRefreshTokenRequest = await axios.post(
      zoomTokenURL,
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: old_refresh_token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${client_Id}:${client_Secret}`
          ).toString("base64")}`,
        },
      }
    );

    // const { data } =  zoomRefreshTokenRequest;
    // const { access_token, refresh_token } = data;

    return zoomRefreshTokenRequest.data;
  } catch (error) {
    console.log(error);
  }
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
