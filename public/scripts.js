  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const scale = [
    { step: 0,  suffix: ""    }, // I
    { step: 2,  suffix: "m"   }, // ii
    { step: 4,  suffix: "m"   }, // iii
    { step: 5,  suffix: ""    }, // IV
    { step: 7,  suffix: ""    }, // V
    { step: 9,  suffix: "m"   }, // vi
    { step: 11, suffix: "dim" }  // vii
  ];

  // pulling chords from database
  const chordDb = {};

  // Sharp and Diminished Chord Shapes
  function getShape(rootIndex, suffix) {
    const name = notes[rootIndex] + suffix;
    if (chordDb[name]) return chordDb[name];

    const a = (rootIndex - 9 + 12) % 12; 
    const e = (rootIndex - 4 + 12) % 12; 

    if (suffix === "dim") return [-1, a, a + 1, a + 2, a + 1, -1];
    if (a <= e) {
      return suffix === "m"
        ? [-1, a, a + 2, a + 2, a + 1, a]
        : [-1, a, a + 2, a + 2, a + 2, a];
    }
    return suffix === "m"
      ? [e, e + 2, e + 2, e, e, e]
      : [e, e + 2, e + 2, e + 1, e, e];
  }

  // SVG Formatting

  function toSvguitarChord(shape, title) {
    const fretted = shape.filter(function (f) { return f > 0; });
    const minFret = Math.min.apply(null, fretted);
    const maxFret = Math.max.apply(null, fretted);
    const shift = maxFret > 4 ? minFret - 1 : 0; 

    const fingers = [];
    shape.forEach(function (fret, i) {
      const string = 6 - i;                 
      if (fret === -1) fingers.push([string, "x"]);
      else if (fret === 0) fingers.push([string, 0]);
      else fingers.push([string, fret - shift]);
    });

    // Bar Chords

    const barres = [];
    const onMin = [];
    shape.forEach(function (f, i) { if (f === minFret) onMin.push(6 - i); });
    if (onMin.length >= 2 && shape.indexOf(0) === -1) {
      barres.push({
        fromString: Math.max.apply(null, onMin),
        toString: Math.min.apply(null, onMin),
        fret: minFret - shift
      });
    }

    return { fingers: fingers, barres: barres, position: shift + 1, title: title };
  }

  function drawChord(container, rootIndex, suffix, displayTitle) {
    const title = displayTitle || notes[rootIndex] + suffix;
    const chart = new svguitar.SVGuitarChord(container);
    chart
      .configure({ title: title, frets: 4, strings: 6, titleFontSize: 40 })
      .chord(toSvguitarChord(getShape(rootIndex, suffix), title))
      .draw();
  }

  const select = document.getElementById("chordSelect");
  const selectedBox = document.getElementById("selected");
  const relatedBox = document.getElementById("related");

  notes.forEach(function (note) {
    const option = document.createElement("option");
    option.value = note;
    option.textContent = note;
    select.appendChild(option);
  });

  function chordAt(rootIndex, degree) {
    const s = scale[degree];
    return { index: (rootIndex + s.step) % 12, suffix: s.suffix };
  }

  function chordName(c) { return notes[c.index] + c.suffix; }

  function update() {
    const rootIndex = notes.indexOf(select.value);
    selectedBox.innerHTML = "";
    relatedBox.innerHTML = "";

    drawChord(selectedBox, rootIndex, "");

    for (let d = 1; d < scale.length; d++) {
      const c = chordAt(rootIndex, d);
      const card = document.createElement("div");
      card.className = "card";
      relatedBox.appendChild(card);
      drawChord(card, c.index, c.suffix);
    }

    showProgressions(rootIndex); 
  }

  select.addEventListener("change", update);

  // Await the chords and progressions from the server, then render.

  document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
      fetch("/api/chords").then(function (res) { return res.json(); }),
      fetch("/api/progressions").then(function (res) { return res.json(); })
    ])
      .then(function (results) {
        results[0].forEach(function (c) { chordDb[c.name] = c.frets; });
        setProgressionData(results[1]);
        update();
      })
      .catch(function () {
        selectedBox.textContent = "Could not load chords. Is the server running?";
      });
  });
