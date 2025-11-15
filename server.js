require("dotenv").config();
const express = require("express");
const path = require("path");
const {
  createFileProfilesStore,
  createAzureProfilesStore,
  DEFAULT_AZURE_STORAGE_CONNECTION_STRING,
} = require("./lib/profilesStore");

const app = express();
const PORT = process.env.PORT || 3000;

const storageProviders = Object.create(null);

storageProviders.file = createFileProfilesStore();

try {
  storageProviders.azure = createAzureProfilesStore({
    connectionString: DEFAULT_AZURE_STORAGE_CONNECTION_STRING,
    tableName: process.env.AZURE_TABLE_NAME,
  });
} catch (error) {
  console.warn("Azure Table Storage nicht verf\u00fcgbar:", error.message);
}

function resolveInitialStorageMode() {
  const preferred = process.env.PROFILE_STORAGE_MODE;
  if (preferred && storageProviders[preferred]) {
    return preferred;
  }
  if (storageProviders.azure) {
    return "azure";
  }
  return "file";
}

let currentStorageMode = resolveInitialStorageMode();

function getCurrentStore() {
  const store = storageProviders[currentStorageMode] || storageProviders.file;
  if (!store) {
    throw new Error("Kein Profil-Speicher verf\u00fcgbar.");
  }
  return store;
}

function buildStorageStatus() {
  const store = getCurrentStore();
  const options = Object.entries(storageProviders)
    .filter(([, provider]) => !!provider)
    .map(([mode, provider]) => ({
      mode,
      label: provider.label,
      description: provider.description,
    }));
  return {
    mode: currentStorageMode,
    label: store.label,
    description: store.description,
    options,
  };
}

app.use(express.json({ limit: "10mb" }));

app.get("/api/profile-storage", (_req, res) => {
  try {
    res.json(buildStorageStatus());
  } catch (error) {
    console.error("Speicherstatus konnte nicht ermittelt werden:", error);
    res.status(500).json({ error: "Speicherstatus unbekannt" });
  }
});

app.post("/api/profile-storage", async (req, res) => {
  const { mode } = req.body || {};
  if (!mode || !storageProviders[mode]) {
    return res.status(400).json({ error: "Unbekannter Speicher" });
  }
  const previousMode = currentStorageMode;
  try {
    currentStorageMode = mode;
    await getCurrentStore().ensureReady();
    res.json(buildStorageStatus());
  } catch (error) {
    currentStorageMode = previousMode;
    console.error("Speichermodus konnte nicht gewechselt werden:", error);
    res.status(500).json({ error: "Speichermodus konnte nicht gewechselt werden" });
  }
});

app.get("/api/profiles", async (_req, res) => {
  try {
    const store = getCurrentStore();
    const profiles = await store.readProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Profile konnten nicht geladen werden:", error);
    res.status(500).json({ error: "Profile konnten nicht geladen werden" });
  }
});

app.post("/api/profiles", async (req, res) => {
  const { profiles } = req.body || {};
  if (!Array.isArray(profiles)) {
    return res.status(400).json({ error: "Ung\u00fcltige Nutzlast" });
  }

  try {
    const store = getCurrentStore();
    await store.writeProfiles(profiles);
    res.status(204).end();
  } catch (error) {
    console.error("Profile konnten nicht gespeichert werden:", error);
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
});

app.use(express.static(path.join(__dirname)));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, async () => {
  try {
    await getCurrentStore().ensureReady();
    console.log(`Profile werden in ${getCurrentStore().label} gespeichert.`);
  } catch (error) {
    console.warn("Der aktive Speicher konnte nicht initialisiert werden:", error);
  }
  console.log(`Server l\u00e4uft auf http://localhost:${PORT}`);
});
