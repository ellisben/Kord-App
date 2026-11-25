// LEVEL METER AND SPECTRUM (green bars mic analyser)

const GREEN = "#5fa96a";
const ORANGE = "#dea020";
const PLATE = "#eaf3f7";
const INK = "#000";
const GRID = "#c2d3da";
const PEAK = "#5d6d74";

// METER CONFIG
const BANDS = 20;
const F_MIN = 80;
const F_MAX = 4000;
const DB_MIN = -100;
const DB_MAX = -15;
const LEVEL_FLOOR = -60;
const CLIP_AT = 0.85; 
const METER_W = 30;
const GAP = 8;

export function createMeter(canvas) {
  const ctx = canvas.getContext("2d");
  let analyser = null;
  let spectrum = null;
  let wave = null;
  let ranges = [];
  let raf = 0;
  let level = 0;
  let levelPeak = 0;
  let bands = new Array(BANDS).fill(0);
  let peaks = new Array(BANDS).fill(0);

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  function plate(x, w, h) {
    ctx.fillStyle = PLATE;
    ctx.fillRect(x, 0, w, h);
    ctx.fillStyle = GRID;
    [0.25, 0.5, 0.75].forEach(function (f) {
      ctx.fillRect(x + 1, Math.round(h * f), w - 2, 1);
    });
  }

  function outline(x, w, h) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, w - 1, h - 1);
  }

  function bar(x, w, h, v) {
    const inner = h - 2;
    const top = inner * v;
    const greenH = Math.min(top, inner * CLIP_AT);
    ctx.fillStyle = GREEN;
    ctx.fillRect(x, h - 1 - greenH, w, greenH);
    if (top > greenH) {
      ctx.fillStyle = ORANGE;
      ctx.fillRect(x, h - 1 - top, w, top - greenH);
    }
  }

  function tick(x, w, h, v) {
    if (v <= 0.02) return;
    ctx.fillStyle = PEAK;
    ctx.fillRect(x, Math.round(h - 1 - (h - 2) * v) - 1, w, 2);
  }

  function draw() {
    const size = fit();
    const w = size.w;
    const h = size.h;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    const sx = METER_W + GAP;
    const sw = w - sx;

    plate(0, METER_W, h);
    plate(sx, sw, h);

    bar(1, METER_W - 2, h, level);
    tick(1, METER_W - 2, h, levelPeak);

    const slot = (sw - 2) / BANDS;
    const bw = Math.max(1, slot - 1);
    for (let k = 0; k < BANDS; k++) {
      const x = sx + 1 + k * slot;
      bar(x, bw, h, bands[k]);
      tick(x, bw, h, peaks[k]);
    }

    outline(0, METER_W, h);
    outline(sx, sw, h);
  }

  function buildRanges(sampleRate, fftSize) {
    const binHz = sampleRate / fftSize;
    const out = [];
    let lo = Math.max(1, Math.round(F_MIN / binHz));
    for (let k = 0; k < BANDS; k++) {
      const edge = F_MIN * Math.pow(F_MAX / F_MIN, (k + 1) / BANDS);
      const hi = Math.max(lo, Math.round(edge / binHz));
      out.push([lo, hi]);
      lo = hi + 1;
    }
    return out;
  }

  function update() {
    analyser.getFloatTimeDomainData(wave);
    let sum = 0;
    for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
    const rms = Math.sqrt(sum / wave.length);
    const db = rms > 0 ? 20 * Math.log10(rms) : LEVEL_FLOOR;
    const target = Math.max(0, Math.min(1, (db - LEVEL_FLOOR) / -LEVEL_FLOOR));
    level = Math.max(target, level - 0.03);
    levelPeak = Math.max(target, levelPeak - 0.006);

    analyser.getFloatFrequencyData(spectrum);
    for (let k = 0; k < BANDS; k++) {
      let top = DB_MIN;
      for (let b = ranges[k][0]; b <= ranges[k][1]; b++) {
        if (spectrum[b] > top) top = spectrum[b];
      }
      const v = Math.max(0, Math.min(1, (top - DB_MIN) / (DB_MAX - DB_MIN)));
      bands[k] = Math.max(v, bands[k] - 0.04);
      peaks[k] = Math.max(v, peaks[k] - 0.008);
    }
  }

  function frame() {
    update();
    draw();
    raf = requestAnimationFrame(frame);
  }

  function clear() {
    level = 0;
    levelPeak = 0;
    bands = new Array(BANDS).fill(0);
    peaks = new Array(BANDS).fill(0);
  }

  function start(node, sampleRate) {
    analyser = node;
    spectrum = new Float32Array(analyser.frequencyBinCount);
    wave = new Float32Array(analyser.fftSize);
    ranges = buildRanges(sampleRate, analyser.fftSize);
    clear();
    frame();
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    analyser = null;
    clear();
    draw();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (!raf) draw(); }).observe(canvas);
  }
  draw();

  return { start: start, stop: stop };
}
