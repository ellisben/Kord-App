// AUTO CORRELATION PITCH DETECTOR ALGORITHM

const MIN_RMS = 0.01; // Silence Cut Off
const PEAK_THRESHOLD_RATIO = 0.5; // Over 50% threshold of first peak

export function detectPitch(buffer, sampleRate, opts = {}) {
  const minFreq = opts.minFreq ?? 60;   // ~B1
  const maxFreq = opts.maxFreq ?? 1500; // ~F#6
  const N = buffer.length;

  // RMS gate 
  let sumSq = 0;
  for (let i = 0; i < N; i++) sumSq += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSq / N);
  if (rms < MIN_RMS) return null;

  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), N - 1);

  // ACF Range
  const r0 = autocorrAt(buffer, 0, N);
  if (r0 === 0) return null;

  let lag = minLag;
  while (lag < maxLag && autocorrAt(buffer, lag, N) > autocorrAt(buffer, lag + 1, N)) lag++;

  // Pick local maximum in ACF range
  let bestLag = -1;
  let bestVal = -Infinity;
  while (lag < maxLag - 1) {
    const a = autocorrAt(buffer, lag - 1, N);
    const b = autocorrAt(buffer, lag, N);
    const c = autocorrAt(buffer, lag + 1, N);
    if (b > a && b >= c && b > bestVal) {
      bestVal = b;
      bestLag = lag;
    }
    lag++;
  }

  if (bestLag < 0 || bestVal / r0 < PEAK_THRESHOLD_RATIO) return null;

  // Parabolic Interpolation
  const a = autocorrAt(buffer, bestLag - 1, N);
  const b = bestVal;
  const c = autocorrAt(buffer, bestLag + 1, N);
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? 0.5 * (a - c) / denom : 0;
  const period = bestLag + shift;

  return sampleRate / period;
}

function autocorrAt(buffer, lag, N) {
  let sum = 0;
  for (let i = 0; i < N - lag; i++) sum += buffer[i] * buffer[i + lag];
  return sum;
}

// Convert frequency to MIDI
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function freqToNote(freq) {
  const midi = freqToMidi(freq);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  const noteIndex = ((nearest % 12) + 12) % 12;
  const octave = Math.floor(nearest / 12) - 1;
  return { note: NOTE_NAMES[noteIndex], octave, cents, midi };
}

// Standard Tuning for Guitar, Bass, Ukulele, and Violin (Alternative tunings to be added soon)
export const TUNINGS = {
  guitar: {
    name: "Guitar (standard)",
    strings: [
      { label: "E2", freq: 82.41 },
      { label: "A2", freq: 110.00 },
      { label: "D3", freq: 146.83 },
      { label: "G3", freq: 196.00 },
      { label: "B3", freq: 246.94 },
      { label: "E4", freq: 329.63 },
    ],
  },
  bass: {
    name: "Bass (4-string)",
    strings: [
      { label: "E1", freq: 41.20 },
      { label: "A1", freq: 55.00 },
      { label: "D2", freq: 73.42 },
      { label: "G2", freq: 98.00 },
    ],
  },
  ukulele: {
    name: "Ukulele (GCEA)",
    strings: [
      { label: "G4", freq: 392.00 },
      { label: "C4", freq: 261.63 },
      { label: "E4", freq: 329.63 },
      { label: "A4", freq: 440.00 },
    ],
  },
  violin: {
    name: "Violin",
    strings: [
      { label: "G3", freq: 196.00 },
      { label: "D4", freq: 293.66 },
      { label: "A4", freq: 440.00 },
      { label: "E5", freq: 659.25 },
    ],
  },
};

export function nearestString(tuningKey, freq) {
  const tuning = TUNINGS[tuningKey];
  if (!tuning) return null;
  let best = tuning.strings[0];
  let bestDist = Math.abs(Math.log2(freq / best.freq));
  for (const s of tuning.strings.slice(1)) {
    const d = Math.abs(Math.log2(freq / s.freq));
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  const cents = Math.round(1200 * Math.log2(freq / best.freq));
  return { ...best, cents };
}
