#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { createProfilesStore } = require("../lib/profilesStore");

async function loadProfilesFromFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed?.profiles)) {
    return parsed.profiles;
  }
  throw new Error(`Datei "${absolutePath}" enthaelt keine gueltigen Profile.`);
}

async function main() {
  const sourceArg = process.argv[2];
  const defaultSource = path.join(__dirname, "..", "data", "profiles.json");
  const sourcePath = sourceArg || defaultSource;

  const profiles = await loadProfilesFromFile(sourcePath);
  if (!profiles.length) {
    console.log(
      `Keine Profile gefunden in "${path.resolve(sourcePath)}". Vorgang beendet.`
    );
    return;
  }

  const store = createProfilesStore();
  await store.ensureTableExists();
  await store.writeProfiles(profiles);

  console.log(
    `Es wurden ${profiles.length} Profile inkl. Statistiken in die Azure Table "${store.tableName}" uebertragen.`
  );
}

main().catch((error) => {
  console.error("Profile konnten nicht in Azure gespeichert werden:", error);
  process.exitCode = 1;
});
