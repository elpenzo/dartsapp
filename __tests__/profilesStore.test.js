jest.mock("@azure/data-tables");

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createFileProfilesStore, createAzureProfilesStore } = require("../lib/profilesStore");
const azureTables = require("@azure/data-tables");

describe("createFileProfilesStore", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "darts-file-store-"));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("writes and reads profile data roundtrip", async () => {
    const store = createFileProfilesStore({ dataDir: tmpDir, fileName: "profiles.json" });
    const payload = [
      { id: "p-1", nickname: "Alpha", stats: { gamesPlayed: 3 } },
      { id: "p-2", nickname: "Beta" },
    ];

    await store.writeProfiles(payload);
    const stored = await store.readProfiles();

    expect(stored).toEqual(payload);
  });

  test("rejects when attempting to write a non-array payload", async () => {
    const store = createFileProfilesStore({ dataDir: tmpDir });
    await expect(store.writeProfiles("invalid")).rejects.toThrow("Ungueltige Nutzlast");
  });

  test("returns an empty list when the data file contains invalid JSON", async () => {
    const store = createFileProfilesStore({ dataDir: tmpDir, fileName: "broken.json" });
    const filePath = path.join(tmpDir, "broken.json");
    await fs.promises.writeFile(filePath, "not valid json", "utf8");

    const stored = await store.readProfiles();

    expect(stored).toEqual([]);
  });
});

describe("createAzureProfilesStore", () => {
  beforeEach(() => {
    azureTables.__resetMocks();
  });

  test("removes obsolete chunk rows when rewriting an existing profile", async () => {
    const store = createAzureProfilesStore({ connectionString: "UseDevelopmentStorage=true;" });
    const instances = azureTables.__getMockInstances();
    const client = instances[instances.length - 1];
    client.seedPartition("player-1", [
      { rowKey: "meta", payload: JSON.stringify({ id: "player-1", nickname: "old" }) },
      { rowKey: "img-000001", chunkData: "old-chunk" },
      { rowKey: "img-000002", chunkData: "obsolete" },
    ]);

    await expect(
      store.writeProfiles([{ id: "player-1", nickname: "new nickname", image: "12345" }])
    ).resolves.not.toThrow();

    const remainingRowKeys = client.getPartitionRowKeys("player-1");
    expect(remainingRowKeys).toEqual(expect.arrayContaining(["meta", "img-000001"]));
    expect(remainingRowKeys).not.toContain("img-000002");
  });
});
