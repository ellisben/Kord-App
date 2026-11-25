// PROGRESSIONS (common, genre specific and experimental)

const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };   // position in the major scale
const FLAT_NAMES = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };

let progData = null;
let mode = "common";
let genre = null;
let currentRoot = 0;
let generated = null;
let starts = {}; 
let transitions = {};
let progIndex = 0;   // which progression is showing on mobile

const progBox = document.getElementById("progressions");
const genreBox = document.getElementById("genreChoices");
const MODES = [
  { key: "common", label: "Common" },
  { key: "genre", label: "Genre" },
  { key: "generator", label: "Experimental" }
];
let genreKnob = null;

const modeKnob = makeKnob({
  el: document.getElementById("modeKnob"),
  readout: document.getElementById("modeReadout"),
  name: "Progression category",
  labels: MODES.map(function (m) { return m.label; }),
  onChange: function (i) { mode = MODES[i].key; progIndex = 0; render(); }
});

// Numeral to chord structure
function chordFromNumeral(rootIndex, numeral) {
  const m = /^(b|#)?(vii|vi|iv|v|iii|ii|i)(°|dim)?$/i.exec(numeral);
  if (!m) return null;
  const degree = ROMAN[m[2].toLowerCase()];
  const shift = m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0;
  const index = (rootIndex + scale[degree].step + shift + 12) % 12;
  const isUpper = m[2] === m[2].toUpperCase();
  const suffix = m[3] ? "dim" : isUpper ? "" : "m";
  const plain = notes[index];
  const root = m[1] === "b" && FLAT_NAMES[plain] ? FLAT_NAMES[plain] : plain;
  return { index: index, suffix: suffix, title: root + suffix };
}

// Converting progression into tab svg 

function progressionBlock(numerals, label) {
  const block = document.createElement("div");
  block.className = "prog-block";

  const chords = numerals.map(function (n) { return chordFromNumeral(currentRoot, n); });
  const head = document.createElement("p");
  head.className = "prog-title";
  head.innerHTML = (label ? "<span>" + label + "</span> " : "") +
    numerals.join(" – ") + ": <strong>" +
    chords.map(function (c) { return c.title; }).join(" – ") + "</strong>";
  block.appendChild(head);

  const row = document.createElement("div");
  row.className = "prog-chords";
  chords.forEach(function (c, i) {
    const card = document.createElement("div");
    card.className = "card";
    const tag = document.createElement("small");
    tag.textContent = numerals[i];
    const chart = document.createElement("div");
    card.appendChild(tag);
    card.appendChild(chart);
    row.appendChild(card);
    drawChord(chart, c.index, c.suffix, c.title);
  });
  block.appendChild(row);

  if (MOBILE.matches) {
    row.classList.add("swipe");
    row.setAttribute("aria-label", "Chords in this progression. Swipe or use the arrows.");
    block.appendChild(stepControls(row, chords.length));
  }
  return block;
}

// ONE PROGRESSION AT A TIME ON MOBILE (arrows step between progressions)

function addBlocks(items) {
  if (!MOBILE.matches) {
    items.forEach(function (p) { progBox.appendChild(progressionBlock(p.numerals, p.label)); });
    return;
  }

  if (progIndex >= items.length) progIndex = 0;

  if (items.length > 1) {
    const nav = document.createElement("div");
    nav.className = "prog-nav";

    const prev = document.createElement("button");
    prev.textContent = "\u2039";
    prev.setAttribute("aria-label", "Previous progression");
    prev.disabled = progIndex === 0;
    prev.addEventListener("click", function () { progIndex--; render(); });

    const label = document.createElement("span");
    label.textContent = "Progression " + (progIndex + 1) + " / " + items.length;

    const next = document.createElement("button");
    next.textContent = "\u203a";
    next.setAttribute("aria-label", "Next progression");
    next.disabled = progIndex === items.length - 1;
    next.addEventListener("click", function () { progIndex++; render(); });

    nav.appendChild(prev);
    nav.appendChild(label);
    nav.appendChild(next);
    progBox.appendChild(nav);
  }

  const shown = items[progIndex];
  progBox.appendChild(progressionBlock(shown.numerals, shown.label));
}

// CATEGORIES (common, genre, experimental)

function showCommon() {
  addBlocks(progData.common.map(function (p) { return { numerals: p.numerals, label: p.name }; }));
}

function showGenre() {
  const names = Object.keys(progData.genres);
  if (!genre) genre = names[0];

  const info = progData.genres[genre];
  const blurb = document.createElement("p");
  blurb.textContent = info.blurb;
  progBox.appendChild(blurb);
  addBlocks(info.progressions.map(function (p) { return { numerals: p.numerals }; }));
}

function showGenerator() {
  const btn = document.createElement("button");
  btn.textContent = generated ? "Generate another" : "Generate a progression";
  btn.addEventListener("click", function () { generated = generateProgression(); render(); });
  progBox.appendChild(btn);

  if (!generated) generated = generateProgression();
  progBox.appendChild(progressionBlock(generated, "Experimental"));
}

// EXPERIMENTAL GENERATOR (picks from the common and genre progressions, but mixes them up)

function allProgressions() {
  let all = progData.common.concat(progData.pool || []);
  Object.keys(progData.genres).forEach(function (g) {
    all = all.concat(progData.genres[g].progressions);
  });
  return all;
}

function learn() {
  starts = {};
  transitions = {};
  allProgressions().forEach(function (p) {
    const n = p.numerals;
    starts[n[0]] = (starts[n[0]] || 0) + 1;
    for (let i = 0; i < n.length - 1; i++) {
      transitions[n[i]] = transitions[n[i]] || {};
      transitions[n[i]][n[i + 1]] = (transitions[n[i]][n[i + 1]] || 0) + 1;
    }
  });
}

function weightedPick(counts) {
  const names = Object.keys(counts);
  let r = Math.random() * names.reduce(function (sum, k) { return sum + counts[k]; }, 0);
  for (let i = 0; i < names.length; i++) {
    r -= counts[names[i]];
    if (r < 0) return names[i];
  }
  return names[names.length - 1];
}

function generateProgression() {
  const known = allProgressions().map(function (p) { return p.numerals.join(" "); });
  for (let tries = 0; tries < 50; tries++) {
    const length = 3 + Math.floor(Math.random() * 2);        // 3 or 4 chords
    const out = [weightedPick(starts)];
    while (out.length < length && transitions[out[out.length - 1]]) {
      out.push(weightedPick(transitions[out[out.length - 1]]));
    }
    const distinct = new Set(out).size;
    if (out.length === length && distinct >= 3 && known.indexOf(out.join(" ")) === -1) return out;
  }
  return allProgressions()[0].numerals;
}

function render() {
  if (!progData) return;
  progBox.innerHTML = "";
  genreBox.classList.toggle("off", mode !== "genre");
  if (genreKnob) genreKnob.setEnabled(mode === "genre");
  if (mode === "common") showCommon();
  else if (mode === "genre") showGenre();
  else showGenerator();
}

function setProgressionData(data) {
  progData = data;
  learn();
  genreKnob = makeKnob({
    el: document.getElementById("genreKnob"),
    readout: document.getElementById("genreReadout"),
    name: "Genre",
    labels: Object.keys(data.genres),
    onChange: function (i, label) { genre = label; progIndex = 0; render(); }
  });
}

function showProgressions(rootIndex) {
  currentRoot = rootIndex;
  render();
}

MOBILE.addEventListener("change", render);