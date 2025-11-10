require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

const { dir: DATA_DIR, file: DATA_FILE } = resolveStorageLocation();

app.use(express.json({ limit: "10mb" }));

function resolveStorageLocation() {
  const envOverride = resolveEnvOverride();
  if (envOverride) {
    return envOverride;
  }

  const defaultDir = resolveDefaultSharePointDir();
  if (defaultDir) {
    return defaultDir;
  }

  const fallbackDir = path.join(__dirname, "data");
  return { dir: fallbackDir, file: path.join(fallbackDir, "profiles.json") };
}

function resolveEnvOverride() {
  const rawValue = process.env.PROFILES_STORAGE_DIR;
  if (!rawValue) {
    return null;
  }

  const expandedPath = expandEnvPlaceholders(rawValue.trim());
  if (!expandedPath) {
    return null;
  }

  if (/^https?:\/\//i.test(expandedPath)) {
    console.warn(
      "PROFILES_STORAGE_DIR zeigt auf eine URL. Bitte gib einen lokalen Pfad an, der ggf. von OneDrive synchronisiert wird."
    );
    return null;
  }

  const absolutePath = path.isAbsolute(expandedPath)
    ? expandedPath
    : path.join(__dirname, expandedPath);
  const isJsonFile = path.extname(absolutePath).toLowerCase() === ".json";

  return {
    dir: isJsonFile ? path.dirname(absolutePath) : absolutePath,
    file: isJsonFile ? absolutePath : path.join(absolutePath, "profiles.json"),
  };
}

function resolveDefaultSharePointDir() {
  const rootCandidates = [
    process.env.PROFILES_DEFAULT_ROOT,
    getEnvValue("OneDriveCommercial"),
    getEnvValue("OneDrive"),
    process.env.USERPROFILE &&
      path.join(process.env.USERPROFILE, "OneDrive - friendWorks GmbH"),
  ].filter(Boolean);

  for (const root of rootCandidates) {
    try {
      if (fs.existsSync(root)) {
        const dir = path.join(root, "Apps", "dartsstats");
        return { dir, file: path.join(dir, "profiles.json") };
      }
    } catch {
      // Ignored: inaccessible candidate
    }
  }
  return null;
}

function expandEnvPlaceholders(value) {
  if (!value) {
    return value;
  }

  const withoutQuotes = value.replace(/^["']|["']$/g, "");
  const replaceToken = (match, token) => {
    const resolved = getEnvValue(token.trim());
    return typeof resolved === "undefined" ? match : resolved;
  };

  const withPercents = withoutQuotes.replace(/%([^%]+)%/g, replaceToken);
  const withBraces = withPercents.replace(/\${([^}]+)}/g, replaceToken);
  const withDollars = withBraces.replace(
    /\$([A-Za-z_][A-Za-z0-9_]*)/g,
    replaceToken
  );

  if (withDollars === "~") {
    return os.homedir();
  }
  if (withDollars.startsWith("~/") || withDollars.startsWith("~\\")) {
    return path.join(os.homedir(), withDollars.slice(2));
  }
  return withDollars;
}

function getEnvValue(name) {
  if (!name) {
    return undefined;
  }
  const variants = [name, name.toUpperCase(), name.toLowerCase()];
  for (const key of variants) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      return process.env[key];
    }
  }
  return undefined;
}

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
  console.log(`Profile werden in ${DATA_FILE} gespeichert.`);
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
