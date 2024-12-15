import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples, sampleRate = 44100) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");

  // FMT sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // Data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function resampleAudio(audioData, originalSampleRate, targetSampleRate) {
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = Math.floor(i * ratio);
    result[i] = audioData[originalIndex];
  }

  return result;
}

const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const transcriptionElement = document.getElementById("transcription");

let audioChunks = [];
let audioContext;
let processor, audioInt;
let speechPipeline;
const WHISPER_SAMPLE_RATE = 16000; // Whisper expects 16kHz audio

async function loadModel() {
  console.log("loading model", speechPipeline);
  if (!speechPipeline) {
    speechPipeline = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", { device: "webgpu", chunk_length_s: 30, stride_length_s: 5 });
  }
  console.log("finished");
  return speechPipeline;
}

async function transcribeAudio(audioBuffer) {
  try {
    if (audioBuffer) {
      var transcription = await speechPipeline(audioBuffer, { sampling_rate: WHISPER_SAMPLE_RATE });
    } else {
      var transcription = await speechPipeline("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav");
    }
    return transcription.text;
  } catch (error) {
    console.error("Transcription error:", error);
    return "Error during transcription: " + error.message;
  }
}

startButton.addEventListener("click", async () => {
  await loadModel();
  //   await transcribeAudio();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      const audioData = event.inputBuffer.getChannelData(0);
      audioChunks.push(...audioData);
      console.log("added audiot", audioChunks.length);
    };
    audioInt = setInterval(() => {
      console.log("processing");
      transcribeChunk(audioChunks);
    }, 4000);
    startButton.disabled = true;
    stopButton.disabled = false;
  });
});

stopButton.addEventListener("click", async () => {
  // Create WAV file for audio playback
  const audioBuffer = new Float32Array(audioChunks);
  const wavBuffer = encodeWAV(audioBuffer, audioContext.sampleRate);
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  const audioElement = document.getElementById("aud");
  audioElement.src = url;
  audioElement.play();

  // Prepare audio for Whisper model (resample to 16kHz)
  const resampledAudio = resampleAudio(audioBuffer, audioContext.sampleRate, WHISPER_SAMPLE_RATE);
  const normalizedAudio = new Float32Array(resampledAudio.length);
  for (let i = 0; i < resampledAudio.length; i++) {
    normalizedAudio[i] = Math.max(-1, Math.min(1, resampledAudio[i]));
  }

  transcriptionElement.textContent = await transcribeAudio(normalizedAudio);

  clearInterval(audioInt);
  audioContext.close();
  processor.disconnect();
  audioContext = null;

  // Reset for next recording
  audioChunks = [];
  startButton.disabled = false;
  stopButton.disabled = true;
});

async function transcribeChunk(chunk) {
  // Create WAV file for audio playback
  const audioBuffer = new Float32Array(chunk);

  // Prepare audio for Whisper model (resample to 16kHz)
  const resampledAudio = resampleAudio(audioBuffer, audioContext.sampleRate, WHISPER_SAMPLE_RATE);
  const normalizedAudio = new Float32Array(resampledAudio.length);
  for (let i = 0; i < resampledAudio.length; i++) {
    normalizedAudio[i] = Math.max(-1, Math.min(1, resampledAudio[i]));
  }

  transcriptionElement.textContent += await transcribeAudio(normalizedAudio);
  audioChunks = [];
}
