const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CHORDS_FILE = path.join(__dirname, "data", "chords.json");
const PROGRESSIONS_FILE = path.join(__dirname, "data", "progressions.json");

function loadChords() {
  return JSON.parse(fs.readFileSync(CHORDS_FILE, "utf8"));
}

// API: returns all chords

app.get("/api/chords", (req, res) => {
  res.json(loadChords());
});

// API: One chord by name
app.get("/api/chords/:name", (req, res) => {
  const chord = loadChords().find((c) => c.name === req.params.name);
  if (!chord) return res.status(404).json({ error: "Chord not found" });
  res.json(chord);
});

// API: progressions 
app.get("/api/progressions", (req, res) => {
  res.json(JSON.parse(fs.readFileSync(PROGRESSIONS_FILE, "utf8")));
});

// Frontend
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
