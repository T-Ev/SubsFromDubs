import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";

let audioChunks = [];
let processor, audioContext;
let audioInt;
let speechPipeline, transPipeline, transPipelineSp;
let watchdog;
const WHISPER_SAMPLE_RATE = 16000; // Whisper expects 16kHz audio
const MIN_CHARS = 9;
const CHUNK_SIZE = 5000; // ms
let ws;

async function testTranslations() {
  let str = `A beginning is the time for taking the most delicate care that the balances are correct. This every sister of the Bene Gesserit knows. To begin your study of the life of Muad'Dib, then, take care that you first place him in his time: born in the 57th year of the Padishah Emperor, Shaddam IV. And take the most special care that you locate Muad'Dib in his place: the planet Arrakis. Do not be deceived by the fact that he was born on Caladan and lived his first fifteen years there. Arrakis, the planet known as Dune, is forever his place.`;
  let transAudio = await transPipeline(str);
  let transAudioSp = await transPipelineSp(str);
  console.log(str, transAudio[0].translation_text, transAudioSp[0].translation_text);
}
let prog = false;
async function transcribeChunk(chunk) {
  if (!prog) {
    prog = true;
    if (watchdog) {
      clearTimeout(watchdog);
    } else {
      watchdog = setTimeout(() => {
        prog = false;
      }, 10000);
    }
    // Create WAV file for audio playback
    const audioBuffer = new Float32Array(chunk);

    // Prepare audio for Whisper model (resample to 16kHz)
    console.time("resample");
    const resampledAudio = resampleAudio(audioBuffer, audioContext.sampleRate, WHISPER_SAMPLE_RATE);
    console.timeEnd("resample");
    //   const normalizedAudio = new Float32Array(resampledAudio.length);
    //   for (let i = 0; i < resampledAudio.length; i++) {
    //     normalizedAudio[i] = Math.max(-1, Math.min(1, resampledAudio[i]));
    //   }
    updateStatus("New Chunk: Transcribing");
    let newText = await transcribeAudio(resampledAudio).then((msg) => {
      if (msg.length > MIN_CHARS) {
        ws.send(
          JSON.stringify({
            type: "text",
            lang: "en",
            data: msg,
          })
        );
      }
      return msg;
    });

    //remove common silence phrases
    let nnText = newText.replace("[BLANK_AUDIO]", "").replace("Thank you.", "");

    if (nnText !== "" && nnText.length > MIN_CHARS) {
      updateStatus("Translating");
      console.time("translation1");
      await transPipeline(nnText).then((msg) => {
        console.timeEnd("translation1");
        ws.send(
          JSON.stringify({
            type: "text",
            lang: "uk",
            data: msg[0].translation_text,
          })
        );
        return msg;
      });

      console.time("translation2");
      await transPipelineSp(nnText).then((msg) => {
        console.timeEnd("translation2");
        ws.send(
          JSON.stringify({
            type: "text",
            lang: "es",
            data: msg[0].translation_text,
          })
        );

        return msg;
      });
      updateStatus("Translation complete. Listening...");
    } else {
      updateStatus("Silence. Listening...");
    }
    prog = false;
    audioChunks = [];
  }
}

async function loadModel() {
  console.log("loading model", speechPipeline);
  $("#loading-overlay").css("display", "flex");
  if (!speechPipeline) {
    updateStatus("Whisper Loading...");
    speechPipeline = await pipeline("automatic-speech-recognition", "distil-whisper/distil-medium.en", { device: "webgpu", language: "en", task: "transcribe" }); //"Xenova/whisper-small.en"/"distil-whisper/distil-large-v3"//, chunk_length_s: 30, stride_length_s: 5
  }
  if (!transPipeline) {
    updateStatus("Translation 1 of 2 Loading...");
    transPipeline = await pipeline("translation", "Xenova/opus-mt-en-uk", { dtype: "q8" });
  }
  if (!transPipelineSp) {
    updateStatus("Translation 2 of 2 Loading...");
    transPipelineSp = await pipeline("translation", "Xenova/opus-mt-en-es", { dtype: "q8" });
  }
  updateStatus("Finished");
  $("#loading-overlay").css("display", "none");
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
  if (audioBuffer) {
    console.time("speech1");
    return speechPipeline(audioBuffer, { sampling_rate: WHISPER_SAMPLE_RATE })
      .then((msg) => {
        console.timeEnd("speech1");
        return msg.text;
      })
      .catch((error) => {
        console.error("Transcription error:", error);
        return "Error during transcription: " + error.message;
      });
  } else {
    return speechPipeline("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav")
      .then((msg) => msg.text)
      .catch((error) => {
        console.error("Transcription error:", error);
        return "Error during transcription: " + error.message;
      });
  }
}
async function startMaster(m) {
  if (m) {
    if (!speechPipeline) await loadModel();
    //   await transcribeAudio();
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          sampleRate: WHISPER_SAMPLE_RATE, // 16000
          channelCount: 1, // mono audio
          echoCancellation: true, // optional
          noiseSuppression: true, // optional
        },
      })
      .then((stream) => {
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
          const audioData = event.inputBuffer.getChannelData(0);
          audioChunks.push(...audioData);
        };

        console.log("started interval");
        updateStatus("Listening...");
        audioInt = setInterval(() => {
          console.log("processing");
          transcribeChunk(audioChunks);
        }, CHUNK_SIZE);
      });
  }
}
function updateStatus(msg) {
  $(".loading-text, .loading-text-master").text(msg);
  console.log(msg);
}
function stopAudioRecording() {
  clearInterval(audioInt);
  if (processor) {
    processor.disconnect();
  }
  if (audioContext) {
    audioContext.close().then(() => {
      console.log("Audio context closed");
    });
  }
  audioChunks = []; // Clear audio chunks
}

export async function initMaster(master, _ws) {
  ws = _ws;
  if (master) {
    //master
    $(".master-wrapper").slideDown(100);
    await loadModel();
    $(".master-start").on("click", function () {
      $(this).toggleClass("active");
      if ($(this).hasClass("active")) {
        startMaster(master);
      } else {
        stopAudioRecording();
        updateStatus("");
      }
    });
  }
}
