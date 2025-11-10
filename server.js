require("dotenv").config();
const express = require("express");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

const app = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = process.env.AZURE_TABLE_NAME || "profiles";
const IMAGE_CHUNK_SIZE =
  Number(process.env.PROFILE_IMAGE_CHUNK_SIZE) || 48_000; // keep chunks <64 KB

const tableConnectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING ||
  process.env.AZURE_TABLES_CONNECTION_STRING;

if (!tableConnectionString) {
  throw new Error(
    "Bitte AZURE_STORAGE_CONNECTION_STRING oder AZURE_TABLES_CONNECTION_STRING setzen."
  );
}

const tableClient = TableClient.fromConnectionString(
  tableConnectionString,
  TABLE_NAME
);

let tableReadyPromise;

function ensureTableExists() {
  if (!tableReadyPromise) {
    tableReadyPromise = tableClient
      .createTable()
      .catch((error) => {
        if (error.statusCode !== 409) {
          throw error;
        }
      })
      .then(() => tableClient);
  }
  return tableReadyPromise;
}

function chunkString(value, size) {
  const normalized =
    typeof value === "string" ? value : value != null ? String(value) : "";
  const chunks = [];
  if (!normalized) {
    return chunks;
  }
  for (let i = 0; i < normalized.length; i += size) {
    chunks.push(normalized.slice(i, i + size));
  }
  return chunks;
}

function escapeOdataValue(value) {
  return String(value).replace(/'/g, "''");
}

async function deletePartition(partitionKey) {
  await ensureTableExists();
  const filter = `PartitionKey eq '${escapeOdataValue(partitionKey)}'`;
  const entities = tableClient.listEntities({
    queryOptions: { filter },
    select: ["PartitionKey", "RowKey"],
  });
  for await (const entity of entities) {
    await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
  }
}

async function fetchExistingProfileIds() {
  await ensureTableExists();
  const filter = "RowKey eq 'meta'";
  const entities = tableClient.listEntities({
    queryOptions: { filter },
    select: ["PartitionKey"],
  });
  const ids = new Set();
  for await (const entity of entities) {
    ids.add(entity.partitionKey);
  }
  return ids;
}

async function replaceProfile(profile) {
  if (!profile || !profile.id) {
    throw new Error("Jedes Profil braucht ein Feld 'id'.");
  }

  await deletePartition(profile.id);

  const { image = "", ...rest } = profile;
  await tableClient.upsertEntity({
    partitionKey: profile.id,
    rowKey: "meta",
    payload: JSON.stringify(rest),
  });

  const chunks = chunkString(image, IMAGE_CHUNK_SIZE);
  await Promise.all(
    chunks.map((chunk, index) =>
      tableClient.upsertEntity({
        partitionKey: profile.id,
        rowKey: `img-${String(index).padStart(5, "0")}`,
        chunkData: chunk,
      })
    )
  );
}

async function readProfiles() {
  await ensureTableExists();
  const grouped = new Map();

  for await (const entity of tableClient.listEntities()) {
    const bucket =
      grouped.get(entity.partitionKey) || { meta: null, chunks: [] };

    if (entity.rowKey === "meta") {
      bucket.meta = JSON.parse(entity.payload || "{}");
      bucket.meta.id = bucket.meta.id || entity.partitionKey;
    } else if (entity.rowKey.startsWith("img-")) {
      bucket.chunks.push({
        key: entity.rowKey,
        data: entity.chunkData || "",
      });
    }

    grouped.set(entity.partitionKey, bucket);
  }

  const profiles = [];
  for (const [partitionKey, bucket] of grouped.entries()) {
    if (!bucket.meta) continue;
    const profile = { ...bucket.meta };
    const sortedChunks = bucket.chunks.sort((a, b) =>
      a.key.localeCompare(b.key)
    );
    profile.image = sortedChunks.map((chunk) => chunk.data).join("");
    if (!profile.image) {
      profile.image = "";
    }
    profile.id = profile.id || partitionKey;
    profiles.push(profile);
  }

  return profiles;
}

async function writeProfiles(profiles) {
  if (!Array.isArray(profiles)) {
    throw new Error("Ungueltige Nutzlast");
  }

  await ensureTableExists();
  const existingIds = await fetchExistingProfileIds();
  const incomingIds = new Set(profiles.map((profile) => profile.id));

  for (const id of existingIds) {
    if (!incomingIds.has(id)) {
      await deletePartition(id);
    }
  }

  for (const profile of profiles) {
    await replaceProfile(profile);
  }
}

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
