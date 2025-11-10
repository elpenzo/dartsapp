require("dotenv").config();
const express = require("express");
const path = require("path");
const { createProfilesStore } = require("./lib/profilesStore");

const app = express();
const PORT = process.env.PORT || 3000;

const profilesStore = createProfilesStore();
const { ensureTableExists, readProfiles, writeProfiles } = profilesStore;
const TABLE_NAME = profilesStore.tableName;

app.use(express.json({ limit: "10mb" }));

app.get("/api/profiles", async (_req, res) => {
  try {
    const profiles = await readProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Profile konnten nicht geladen werden:", error);
    res.status(500).json({ error: "Profile konnten nicht geladen werden" });
  }
});

app.post("/api/profiles", async (req, res) => {
  const { profiles } = req.body || {};
  if (!Array.isArray(profiles)) {
    return res.status(400).json({ error: "Ungueltige Nutzlast" });
  }
  try {
    await writeProfiles(profiles);
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

app.listen(PORT, async () => {
  await ensureTableExists();
  console.log(`Azure Table '${TABLE_NAME}' wird verwendet.`);
  console.log(`Server laeuft auf http://localhost:${PORT}`);
});
