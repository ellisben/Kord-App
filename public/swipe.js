// MOBILE SWIPE HELPERS (scroll-snap rows, step controls and the section pager)

const MOBILE = window.matchMedia("(max-width: 700px)");

function scrollRowTo(row, i, smooth) {
  const left = i * row.clientWidth;
  if (smooth && row.scrollTo) row.scrollTo({ left: left, behavior: "smooth" });
  else row.scrollLeft = left;
}

// A row of full-width slides. onIndex(i) fires when the visible slide changes,
// whether the person swiped to it or go() was called.
function swipeRow(row, onIndex) {
  let current = 0;
  let target = null;
  let timer = 0;
  let raf = 0;

  function indexNow() {
    return row.clientWidth ? Math.round(row.scrollLeft / row.clientWidth) : 0;
  }

  row.addEventListener("scroll", function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      const i = indexNow();
      if (target !== null) {
        if (i === target) target = null;
        return;
      }
      if (i !== current) { current = i; onIndex(i); }
    });
  }, { passive: true });

  function go(i, smooth) {
    current = i;
    target = i;
    clearTimeout(timer);
    timer = setTimeout(function () { target = null; }, 600);
    onIndex(i);
    scrollRowTo(row, i, smooth);
  }

  return { go: go };
}

// Prev / next buttons, dots and a counter for a swipe row of chords
function stepControls(row, count) {
  const bar = document.createElement("div");
  bar.className = "steps";

  const prev = document.createElement("button");
  prev.textContent = "\u2039";
  prev.setAttribute("aria-label", "Previous chord");
  const next = document.createElement("button");
  next.textContent = "\u203a";
  next.setAttribute("aria-label", "Next chord");

  const mid = document.createElement("div");
  mid.className = "steps-mid";
  const dots = document.createElement("span");
  dots.className = "dots";
  for (let i = 0; i < count; i++) dots.appendChild(document.createElement("i"));
  const counter = document.createElement("span");
  counter.className = "count";
  mid.appendChild(dots);
  mid.appendChild(counter);

  let index = 0;
  function show(i) {
    index = i;
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === i); });
    counter.textContent = (i + 1) + " / " + count;
    prev.disabled = i === 0;
    next.disabled = i === count - 1;
  }

  const swipe = swipeRow(row, show);
  prev.addEventListener("click", function () { swipe.go(index - 1, true); });
  next.addEventListener("click", function () { swipe.go(index + 1, true); });

  bar.appendChild(prev);
  bar.appendChild(mid);
  bar.appendChild(next);
  show(0);
  return bar;
}

// SECTION PAGER (swipe or tap between Related chords and Progressions)
(function () {
  const pager = document.getElementById("pager");
  if (!pager) return;
  const tabs = document.querySelectorAll(".views button");
  const panes = pager.querySelectorAll(".pane");
  let shown = 0;

  function fit() {
    if (!MOBILE.matches) { pager.style.height = ""; return; }
    pager.style.height = panes[shown].offsetHeight + "px";
  }

  function show(i) {
    shown = i;
    tabs.forEach(function (t, k) { t.setAttribute("aria-selected", String(k === i)); });
    fit();
  }

  const swipe = swipeRow(pager, show);
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { swipe.go(k, true); });
  });

  if (window.ResizeObserver) {
    panes.forEach(function (p) { new ResizeObserver(fit).observe(p); });
  }
  window.addEventListener("resize", fit);
  fit();
})();