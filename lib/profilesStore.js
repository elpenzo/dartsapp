const fs = require("fs");
const path = require("path");
const { TableClient } = require("@azure/data-tables");

const DEFAULT_AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING ||
  process.env.AZURE_TABLES_CONNECTION_STRING ||
  "DefaultEndpointsProtocol=https;AccountName=flip;AccountKey=+83tFg8m0ILqRusrZrrK/LLGO4KWL/YbxHIqN9o9+xJVf9Vt1hJx+Ey9Mbtbxlv/weG1WtIMNRFZ+AStS9eBXA==;EndpointSuffix=core.windows.net";
const MAX_TABLE_STRING_CHARS = 32_000; // Azure Table Storage limit (UTF-16 chars)
const SAFE_IMAGE_CHUNK_SIZE = 28_000; // leave headroom for metadata/encoding overhead

function createFileProfilesStore(options = {}) {
  const dataDir = path.resolve(options.dataDir || path.join(__dirname, "..", "data"));
  const fileName = options.fileName || "profiles.json";
  const dataFile = path.join(dataDir, fileName);
  const label = `Lokale Datei (${path.relative(process.cwd(), dataFile)})`;
  const description = `JSON-Datei unter ${dataFile}`;

  function ensureDataFile() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, "[]");
    }
  }

  async function ensureReady() {
    ensureDataFile();
  }

  async function readProfiles() {
    ensureDataFile();
    try {
      const content = await fs.promises.readFile(dataFile, "utf8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Profile konnten nicht aus der lokalen Datei gelesen werden:", error);
      return [];
    }
  }

  async function writeProfiles(profiles) {
    if (!Array.isArray(profiles)) {
      throw new Error("Ungueltige Nutzlast");
    }
    ensureDataFile();
    await fs.promises.writeFile(dataFile, JSON.stringify(profiles, null, 2));
  }

  return {
    mode: "file",
    label,
    description,
    ensureReady,
    readProfiles,
    writeProfiles,
  };
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

function createAzureProfilesStore(options = {}) {
  const connectionString =
    options.connectionString || DEFAULT_AZURE_STORAGE_CONNECTION_STRING;
  const tableName =
    options.tableName || process.env.AZURE_TABLE_NAME || "profiles";
  const requestedChunkSize =
    Number(options.imageChunkSize || process.env.PROFILE_IMAGE_CHUNK_SIZE) ||
    SAFE_IMAGE_CHUNK_SIZE;
  const maxAllowedChunkSize = MAX_TABLE_STRING_CHARS - 100;
  if (requestedChunkSize > maxAllowedChunkSize) {
    console.warn(
      `PROFILE_IMAGE_CHUNK_SIZE (${requestedChunkSize}) ist zu gross für Azure Table Storage. Verwende ${maxAllowedChunkSize} Zeichen pro Chunk.`
    );
  }
  const imageChunkSize = Math.max(1_000, Math.min(requestedChunkSize, maxAllowedChunkSize));

  if (!connectionString) {
    throw new Error("Azure Connection String fehlt.");
  }

  const tableClient = TableClient.fromConnectionString(
    connectionString,
    tableName
  );
  const label = `Azure Table (${tableName})`;
  const description = `Azure Storage Table '${tableName}'`;
  let tableReadyPromise = null;

  function ensureReady() {
    if (!tableReadyPromise) {
      tableReadyPromise = tableClient
        .createTable()
        .catch((error) => {
          if (error?.statusCode !== 409) {
            tableReadyPromise = null;
            throw error;
          }
        });
    }
    return tableReadyPromise;
  }

  async function deletePartition(partitionKey) {
    await ensureReady();
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
    await ensureReady();
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
      throw new Error("Jedes Profil benoetigt ein Feld 'id'.");
    }

    await deletePartition(profile.id);

    const { image = "", ...rest } = profile;
    await tableClient.upsertEntity({
      partitionKey: profile.id,
      rowKey: "meta",
      payload: JSON.stringify(rest),
    });

    const chunks = chunkString(image, imageChunkSize);
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
    await ensureReady();
    const grouped = new Map();

    for await (const entity of tableClient.listEntities()) {
      const bucket =
        grouped.get(entity.partitionKey) || { meta: null, chunks: [] };

      if (entity.rowKey === "meta") {
        try {
          bucket.meta = JSON.parse(entity.payload || "{}");
        } catch (_error) {
          bucket.meta = {};
        }
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

    await ensureReady();
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

  return {
    mode: "azure",
    label,
    description,
    ensureReady,
    readProfiles,
    writeProfiles,
  };
}

module.exports = {
  createFileProfilesStore,
  createAzureProfilesStore,
  DEFAULT_AZURE_STORAGE_CONNECTION_STRING,
};
