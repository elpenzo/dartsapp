const mockInstances = [];

class MockTableClient {
  constructor(connectionString, tableName) {
    this.connectionString = connectionString;
    this.tableName = tableName;
    this.partitions = new Map();
    this.listEntitiesCalls = [];
    this.createdTables = 0;
  }

  seedPartition(partitionKey, rows = []) {
    const bucket = this.partitions.get(partitionKey) || new Map();
    rows.forEach((row) => {
      if (!row || !row.rowKey) {
        throw new Error("RowKey required for seed data");
      }
      const entity = {
        partitionKey,
        rowKey: row.rowKey,
        payload: row.payload,
        chunkData: row.chunkData,
      };
      bucket.set(entity.rowKey, entity);
    });
    this.partitions.set(partitionKey, bucket);
  }

  getPartitionRowKeys(partitionKey) {
    const bucket = this.partitions.get(partitionKey);
    return bucket ? Array.from(bucket.keys()) : [];
  }

  async createTable() {
    this.createdTables += 1;
  }

  listEntities(options = {}) {
    this.listEntitiesCalls.push(options);
    const filter = options?.queryOptions?.filter || "";
    const select = Array.isArray(options?.select) ? options.select : null;
    const partitionKey = extractPartitionKey(filter);
    const partitions = partitionKey ? [partitionKey] : Array.from(this.partitions.keys());
    const rows = [];
    partitions.forEach((key) => {
      const bucket = this.partitions.get(key);
      if (!bucket) return;
      for (const entity of bucket.values()) {
        const base = {
          partitionKey: key,
          rowKey: entity.rowKey,
          payload: entity.payload,
          chunkData: entity.chunkData,
        };
        rows.push(applySelect(base, select));
      }
    });
    return iterate(rows);
  }

  async deleteEntity(partitionKey, rowKey) {
    if (!rowKey) {
      throw new Error("RowKey required");
    }
    const bucket = this.partitions.get(partitionKey);
    if (bucket) {
      bucket.delete(rowKey);
    }
  }

  async upsertEntity(entity) {
    const bucket = this.partitions.get(entity.partitionKey) || new Map();
    const stored = {
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey,
      payload: entity.payload,
      chunkData: entity.chunkData,
    };
    bucket.set(entity.rowKey, stored);
    this.partitions.set(entity.partitionKey, bucket);
  }
}

function applySelect(entity, select) {
  if (!select || !select.length) {
    return entity;
  }
  const normalized = new Set(select.map((key) => String(key).toLowerCase()));
  const filtered = {};
  if (normalized.has("partitionkey")) {
    filtered.partitionKey = entity.partitionKey;
  }
  if (normalized.has("rowkey")) {
    filtered.rowKey = entity.rowKey;
  }
  if (normalized.has("payload")) {
    filtered.payload = entity.payload;
  }
  if (normalized.has("chunkdata")) {
    filtered.chunkData = entity.chunkData;
  }
  return filtered;
}

function extractPartitionKey(filter) {
  const match = /PartitionKey eq '([^']+)'/i.exec(filter);
  return match ? match[1] : null;
}

async function* iterate(items) {
  for (const item of items) {
    yield item;
  }
}

function resetMocks() {
  mockInstances.length = 0;
}

module.exports = {
  __resetMocks: resetMocks,
  __getMockInstances: () => mockInstances,
  TableClient: {
    fromConnectionString(connectionString, tableName) {
      const client = new MockTableClient(connectionString, tableName);
      mockInstances.push(client);
      return client;
    },
  },
};
