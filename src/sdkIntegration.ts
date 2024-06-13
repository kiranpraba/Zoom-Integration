const ZoomMtg = require('@zoomus/websdk');
const apiKey= '97U_LO8jTsyvuZjBAIRe4w'
const apiSecret= 'KIRKJ52AbTjKcLJAWHl1YDpYQsB5n8y3'
const Secret_Token = 'utKNqZrdSFifpnKkr-GPdQ'
const Verification_Token ='QQLRNA99SXOXR7T1WDACUg'

// Replace placeholders with your actual credentials
// const apiKey = 'YOUR_ZOOM_API_KEY';
// const apiSecret = 'YOUR_ZOOM_API_SECRET';

// Replace with the signature generated from your server-side code (see next step)
const signature = 'YOUR_SIGNATURE';

const meetingConfig = {
  apiKey: apiKey,
  meetingNumber: '', // Optional: Provide a meeting number if joining an existing meeting
  userName: 'Your Name',
  userEmail: 'youremail@example.com',
  password: '', // Optional: Password for joining a meeting, if applicable
  leaveUrl: 'https://www.zoom.us', // URL to redirect to upon leaving the meeting
  sdk: ZoomMtg, // Pass the ZoomMtg object
  signature: signature,
  role: 1, // 1 for host, 0 for attendee
  element: document.getElementById('zoom-mtg-container'), // Container element for the meeting
};

// Function to generate the meeting signature on your server-side (Node.js)
async function generateMeetingSignature(meetingNumber, role) {
  const CryptoJS = require('crypto-js'); // Install crypto-js package (npm install crypto-js)

  const timestamp = new Date().getTime() - 300000; // Adjust for potential clock skew
  const meetingSecret = apiSecret;
  const msg = `${apiKey}${meetingNumber}${timestamp}${role}`;
  const hash = CryptoJS.HmacSHA256(msg, meetingSecret);
  const base64Digest = hash.toString(CryptoJS.enc.Base64);
  const signature = base64Digest.replace(/=/g, '');
  return signature;
}

// Example usage (assuming you have a button to initiate the meeting)
async function initZoomMeeting() {
  try {
    // Generate the signature on the server-side and replace the placeholder
    const meetingSignature = await generateMeetingSignature('YOUR_MEETING_NUMBER', meetingConfig.role);
    meetingConfig.signature = meetingSignature;

    ZoomMtg.preJoinMeeting(meetingConfig, function(status) {
      if (status === 0) {
        console.log('Pre-meeting join success');
        ZoomMtg.joinMeeting(meetingConfig);
      } else {
        console.error('Pre-meeting join fail: ', status);
      }
    });
  } catch (error) {
    console.error('Error generating meeting signature:', error);
  }
}