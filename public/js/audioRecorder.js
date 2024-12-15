import { webmFixDuration } from "../utils/BlobFix.js"; // Ensure this matches the named export

function getMimeType() {
  const types = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/aac"];

  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) {
      return types[i];
    }
  }

  return undefined;
}

export default class AudioRecorder {
  constructor(onRecordingComplete) {
    this.recording = false;
    this.recordedBlob = null;
    this.streamRef = null;
    this.mediaRecorderRef = null;
    this.chunksRef = [];
    this.onRecordingComplete = onRecordingComplete;
  }

  async startRecording() {
    this.recordedBlob = null;
    let startTime = Date.now();

    try {
      if (!this.streamRef) {
        this.streamRef = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const mimeType = getMimeType();
      const mediaRecorder = new MediaRecorder(this.streamRef, { mimeType });
      this.mediaRecorderRef = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          this.chunksRef.push(event.data);
        }

        if (mediaRecorder.state === "inactive") {
          const duration = Date.now() - startTime;
          let blob = new Blob(this.chunksRef, { type: mimeType });

          if (mimeType === "audio/webm") {
            blob = await webmFixDuration(blob, duration, blob.type);
          }

          this.recordedBlob = blob;
          this.onRecordingComplete(blob);
          this.chunksRef = [];
        }
      });

      mediaRecorder.start();
      this.recording = true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  stopRecording() {
    if (this.mediaRecorderRef && this.mediaRecorderRef.state === "recording") {
      this.mediaRecorderRef.stop();
      this.recording = false;
    }
  }
}
