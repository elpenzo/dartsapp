const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "profiles.json");

app.use(express.json({ limit: "1mb" }));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

function readProfiles() {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Konnte Profile nicht lesen:", error);
  }
  return [];
}

function writeProfiles(profiles) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2));
}

app.get("/api/profiles", (_req, res) => {
  const profiles = readProfiles();
  res.json(profiles);
});

app.post("/api/profiles", (req, res) => {
  const { profiles } = req.body || {};
  if (!Array.isArray(profiles)) {
    return res.status(400).json({ error: "Ungültige Nutzlast" });
  }
  try {
    writeProfiles(profiles);
    res.status(204).end();
  } catch (error) {
    console.error("Konnte Profile nicht speichern:", error);
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
});

app.use(express.static(path.join(__dirname)));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
