// LISTENER 

import { detectPitch, freqToNote } from "./detector.js";

const btn = document.getElementById("listenBtn");
const heardEl = document.getElementById("heard");
const statusEl = document.getElementById("listenStatus");
const select = document.getElementById("chordSelect");

const BUFFER_SIZE = 2048;
const CHECK_EVERY_MS = 80;
const STABLE_READINGS = 5; 

let audioCtx = null;
let analyser = null;
let stream = null;
let buffer = null;
let timer = null;
let candidate = null;
let count = 0;

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
  } catch (err) {
    statusEl.textContent = "Microphone blocked: " + err.message;
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = BUFFER_SIZE;
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  buffer = new Float32Array(analyser.fftSize);

  timer = setInterval(listen, CHECK_EVERY_MS);
  btn.textContent = "Stop listening";
  statusEl.textContent = "Listening...";
}

function stop() {
  clearInterval(timer);
  stream.getTracks().forEach(function (t) { t.stop(); });
  audioCtx.close();
  stream = null;
  audioCtx = null;
  candidate = null;
  count = 0;
  btn.textContent = "Start listening";
  statusEl.textContent = "Mic off.";
}

function listen() {
  analyser.getFloatTimeDomainData(buffer);
  const freq = detectPitch(buffer, audioCtx.sampleRate);

  if (!freq) {                   
    candidate = null;
    count = 0;
    heardEl.textContent = "—";
    return;
  }

  const note = freqToNote(freq).note; 
  heardEl.textContent = note;

  if (note === candidate) count++;
  else { candidate = note; count = 1; }

  if (count === STABLE_READINGS && select.value !== note) {
    select.value = note;
    select.dispatchEvent(new Event("change"));
  }
}

btn.addEventListener("click", function () {
  if (stream) stop();
  else start();
});
