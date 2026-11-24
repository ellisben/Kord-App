// LISTENER 

import { detectPitch, freqToNote } from "./detector.js";

const btn = document.getElementById("listenBtn");
const heardEl = document.getElementById("heard");
const statusEl = document.getElementById("listenStatus");
const select = document.getElementById("chordSelect");
const freqEl = document.getElementById("freqHz");
const heldEl = document.getElementById("heldHz");
const logEl = document.getElementById("freqLog");
const clearBtn = document.getElementById("clearLog");

const BUFFER_SIZE = 2048;
const CHECK_EVERY_MS = 80;
const STABLE_READINGS = 5; 
const LOG_MAX = 10;

let audioCtx = null;
let analyser = null;
let stream = null;
let buffer = null;
let timer = null;
let candidate = null;
let count = 0;
let readings = [];
let captures = 0;

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
  statusEl.textContent = "Listening... (" + audioCtx.sampleRate + " Hz sample rate)";
}

function stop() {
  clearInterval(timer);
  stream.getTracks().forEach(function (t) { t.stop(); });
  audioCtx.close();
  stream = null;
  audioCtx = null;
  candidate = null;
  count = 0;
  readings = [];
  freqEl.textContent = "—";
  btn.textContent = "Start listening";
  statusEl.textContent = "Mic off.";
}

function listen() {
  analyser.getFloatTimeDomainData(buffer);
  const freq = detectPitch(buffer, audioCtx.sampleRate);

  if (!freq) {                   
    candidate = null;
    count = 0;
    readings = [];
    heardEl.textContent = "—";
    freqEl.textContent = "—";
    return;
  }

  const note = freqToNote(freq).note; 
  heardEl.textContent = note;
  freqEl.textContent = freq.toFixed(2) + " Hz";

  if (note === candidate) { count++; readings.push(freq); }
  else { candidate = note; count = 1; readings = [freq]; }

  if (count === STABLE_READINGS) {
    holdReading(note, readings);
    if (select.value !== note) {
      select.value = note;
      select.dispatchEvent(new Event("change"));
    }
  }
}

function holdReading(note, values) {
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  const hz = sorted[Math.floor(sorted.length / 2)].toFixed(2);
  captures++;

  heldEl.textContent = "#" + captures + " " + note + " — " + hz + " Hz";

  const li = document.createElement("li");
  li.textContent = "#" + captures + "  " + note + "  " + hz + " Hz";
  logEl.insertBefore(li, logEl.firstChild);
  while (logEl.children.length > LOG_MAX) logEl.removeChild(logEl.lastChild);
}

clearBtn.addEventListener("click", function () {
  captures = 0;
  heldEl.textContent = "—";
  logEl.innerHTML = "";
});

btn.addEventListener("click", function () {
  if (stream) stop();
  else start();
});