// ROTARY KNOB (drag up/down, tap, or use arrow keys to step through a list of labels)

const KNOB_SWEEP = 135; // degrees either side of straight up
const KNOB_C = 28;      // centre of the 56 x 56 drawing

function knobPoint(r, deg) {
  const a = deg * Math.PI / 180;
  return { x: KNOB_C + r * Math.sin(a), y: KNOB_C - r * Math.cos(a) };
}

function makeKnob(opts) {
  const el = opts.el;
  const labels = opts.labels;
  const readout = opts.readout || null;
  let index = opts.index || 0;
  let enabled = true;

  let startY = 0;
  let startIndex = 0;
  let dragging = false;
  let moved = false;

  function angleFor(i) {
    return -KNOB_SWEEP + i * (2 * KNOB_SWEEP) / (labels.length - 1);
  }

  let ticks = "";
  labels.forEach(function (label, i) {
    const a = knobPoint(21, angleFor(i));
    const b = knobPoint(24, angleFor(i));
    ticks += '<line class="knob-tick" x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) +
      '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '"/>';
  });

  el.innerHTML = '<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">' + ticks +
    '<path class="knob-arc"/><circle class="knob-body" cx="28" cy="28" r="17"/>' +
    '<line class="knob-pointer"/></svg>';

  el.setAttribute("role", "slider");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", opts.name || "Knob");
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", String(labels.length - 1));

  const arc = el.querySelector(".knob-arc");
  const pointer = el.querySelector(".knob-pointer");

  function draw() {
    const a = angleFor(index);
    const p1 = knobPoint(4, a);
    const p2 = knobPoint(14, a);
    pointer.setAttribute("x1", p1.x.toFixed(2));
    pointer.setAttribute("y1", p1.y.toFixed(2));
    pointer.setAttribute("x2", p2.x.toFixed(2));
    pointer.setAttribute("y2", p2.y.toFixed(2));

    const s = knobPoint(26, -KNOB_SWEEP);
    const e = knobPoint(26, a);
    const large = (a + KNOB_SWEEP) > 180 ? 1 : 0;
    arc.setAttribute("d", index === 0 ? "" :
      "M" + s.x.toFixed(2) + " " + s.y.toFixed(2) +
      " A26 26 0 " + large + " 1 " + e.x.toFixed(2) + " " + e.y.toFixed(2));

    el.setAttribute("aria-valuenow", String(index));
    el.setAttribute("aria-valuetext", labels[index]);
    if (readout) readout.textContent = labels[index];
  }

  function setIndex(i) {
    i = Math.max(0, Math.min(labels.length - 1, i));
    if (i === index) return;
    index = i;
    draw();
    if (opts.onChange) opts.onChange(index, labels[index]);
  }

  function cycle() {
    setIndex(index + 1 >= labels.length ? 0 : index + 1);
  }

  el.addEventListener("pointerdown", function (e) {
    if (!enabled) return;
    dragging = true;
    moved = false;
    startY = e.clientY;
    startIndex = index;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 4) moved = true;
    if (moved) setIndex(startIndex + Math.round(dy / 20));
  });

  el.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    if (!moved) cycle();
  });

  el.addEventListener("pointercancel", function () { dragging = false; });

  el.addEventListener("keydown", function (e) {
    if (!enabled) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") setIndex(index + 1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") setIndex(index - 1);
    else if (e.key === "Home") setIndex(0);
    else if (e.key === "End") setIndex(labels.length - 1);
    else if (e.key === "Enter" || e.key === " ") cycle();
    else return;
    e.preventDefault();
  });

  function setEnabled(on) {
    enabled = on;
    dragging = false;
    el.classList.toggle("off", !on);
    el.setAttribute("aria-disabled", String(!on));
    el.setAttribute("tabindex", on ? "0" : "-1");
  }

  draw();
  return { setEnabled: setEnabled, setIndex: setIndex };
}
