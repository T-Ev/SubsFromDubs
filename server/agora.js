import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;
import AgoraRTC from "agora-rtc-sdk-ng";

class AgoraService {
  constructor() {
    // Replace with your Agora credentials
    this.appId = process.env.AGORA_APP_ID;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE;
    this.rtcEngine = null;
  }

  // Generate token for client authentication
  generateToken(channelName, uid) {
    if (!this.appId || !this.appCertificate) {
      throw new Error("AGORA_APP_ID and AGORA_APP_CERTIFICATE must be defined");
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    return RtcTokenBuilder.buildTokenWithUid(this.appId, this.appCertificate, channelName, uid, RtcRole.PUBLISHER, privilegeExpiredTs);
  }

  // Initialize RTT service
  async initializeRTT(channelName) {
    try {
      this.rtcEngine = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      await this.rtcEngine.initialize(this.appId);

      // Enable RTT feature
      await this.rtcEngine.enableTranscription();

      // Configure RTT settings
      await this.rtcEngine.setTranscriptionOptions({
        enableTranscription: true,
        recognizationLanguage: "en-US", // Default to English
      });

      // Join the channel
      await this.rtcEngine.joinChannel(null, channelName, null, 0);

      // Set up transcription callback
      this.rtcEngine.on("transcriptionResult", (userId, text) => {
        this.handleTranscription(userId, text);
      });
    } catch (error) {
      console.error("Error initializing Agora RTT:", error);
      throw error;
    }
  }

  // Handle incoming transcriptions
  handleTranscription(userId, text) {
    // Emit the transcription to connected clients
    // You'll need to implement this based on your WebSocket setup
    console.log(`Transcription from user ${userId}: ${text}`);

    // Example: If using Socket.io
    // io.to(channelName).emit('transcription', { userId, text });
  }

  // Stop RTT service
  async stopRTT() {
    if (this.rtcEngine) {
      await this.rtcEngine.leaveChannel();
      await this.rtcEngine.disable();
      this.rtcEngine = null;
    }
  }

  // Change transcription language
  async setLanguage(language) {
    if (this.rtcEngine) {
      await this.rtcEngine.setTranscriptionOptions({
        recognizationLanguage: language,
      });
    }
  }
}

const agoraService = new AgoraService();
export default agoraService;
