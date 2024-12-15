import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";

let audioChunks = [];
let processor, audioContext;
let audioInt, textArea;
let speechPipeline;
const WHISPER_SAMPLE_RATE = 16000; // Whisper expects 16kHz audio
const CHARACTER_THRESHOLD = 100;

async function transcribeChunk(chunk) {
  // Create WAV file for audio playback
  const audioBuffer = new Float32Array(chunk);

  // Prepare audio for Whisper model (resample to 16kHz)
  const resampledAudio = resampleAudio(audioBuffer, audioContext.sampleRate, WHISPER_SAMPLE_RATE);
  //   const normalizedAudio = new Float32Array(resampledAudio.length);
  //   for (let i = 0; i < resampledAudio.length; i++) {
  //     normalizedAudio[i] = Math.max(-1, Math.min(1, resampledAudio[i]));
  //   }

  let newText = await transcribeAudio(resampledAudio);
  let nnText = newText.replace("[BLANK_AUDIO]", "");
  if (nnText !== "") {
    if (textArea.value.length >= CHARACTER_THRESHOLD) textArea.value = "";
    textArea.value += nnText;
    const event = new Event("input", { bubbles: true });
    textArea.dispatchEvent(event);
  }
  audioChunks = [];
}

async function loadModel() {
  console.log("loading model", speechPipeline);
  if (!speechPipeline) {
    speechPipeline = await pipeline("automatic-speech-recognition", "Xenova/whisper-small.en", { device: "webgpu" }); //, chunk_length_s: 30, stride_length_s: 5
  }
  console.log("finished");
  return speechPipeline;
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
async function startMaster() {
  const master = new URLSearchParams(window.location.search).get("master");
  if (master) {
    textArea = document.getElementById("text-area");
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
        //   console.log("added audiot", audioChunks.length);
      };
      audioInt = setInterval(() => {
        console.log("processing");
        transcribeChunk(audioChunks);
      }, 10000);
    });
  }
}

window.addEventListener("load", startMaster);
