jest.mock("express", () => {
  const { fn } = require("jest-mock");

  const express = fn(() => {
    const handlers = { get: [], post: [], use: [] };
    const app = {
      handlers,
      use: fn(function (...args) {
        handlers.use.push(args);
        return this;
      }),
      get: fn(function (path, handler) {
        handlers.get.push({ path, handler });
        return this;
      }),
      post: fn(function (path, handler) {
        handlers.post.push({ path, handler });
        return this;
      }),
      listen: fn(function (_port, callback) {
        if (typeof callback === "function") {
          callback();
        }
        return { close: fn() };
      }),
    };
    express.__apps.push(app);
    return app;
  });

  express.__apps = [];
  express.__getLastApp = () => express.__apps[express.__apps.length - 1];
  express.json = fn(() => "json-middleware");
  express.static = fn(() => "static-middleware");

  return express;
});

jest.mock("../lib/profilesStore", () => {
  const { fn } = require("jest-mock");

  const createStore = (mode) => ({
    mode,
    label: `${mode} store`,
    description: `${mode} store`,
    ensureReady: fn(() => Promise.resolve()),
    readProfiles: fn(() => Promise.resolve([{ id: `${mode}-profile` }])),
    writeProfiles: fn(() => Promise.resolve()),
  });

  const stores = {
    fileStore: createStore("file"),
    azureStore: createStore("azure"),
  };

  return {
    createFileProfilesStore: fn(() => stores.fileStore),
    createAzureProfilesStore: fn(() => stores.azureStore),
    DEFAULT_AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true;",
    __stores: stores,
  };
});

describe("POST /api/profile-storage", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.PROFILE_STORAGE_MODE = "file";
  });

  afterEach(() => {
    delete process.env.PROFILE_STORAGE_MODE;
  });

  test("keeps the previous storage when the target store fails to initialize", async () => {
    const { app, stores } = loadServer();
    stores.azureStore.ensureReady.mockRejectedValue(new Error("Azure offline"));
    stores.azureStore.readProfiles.mockRejectedValue(new Error("Azure read should not happen"));

    const switchHandler = getRouteHandler(app, "post", "/api/profile-storage");
    const profilesHandler = getRouteHandler(app, "get", "/api/profiles");

    const switchResponse = createMockResponse();
    await switchHandler({ body: { mode: "azure" } }, switchResponse);
    expect(switchResponse.status).toHaveBeenCalledWith(500);

    const profilesResponse = createMockResponse();
    await profilesHandler({}, profilesResponse);

    expect(stores.fileStore.readProfiles).toHaveBeenCalledTimes(1);
    expect(stores.azureStore.readProfiles).not.toHaveBeenCalled();
  });
});

function loadServer() {
  const express = require("express");
  const storesModule = require("../lib/profilesStore");
  require("../server");
  const app = express.__getLastApp();
  return { app, stores: storesModule.__stores };
}

function getRouteHandler(app, method, path) {
  const entry = app.handlers[method].find((route) => route.path === path);
  if (!entry) {
    throw new Error(`Handler for ${method.toUpperCase()} ${path} not found`);
  }
  return entry.handler;
}

function createMockResponse() {
  return {
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (body) {
      this.body = body;
      return this;
    }),
    send: jest.fn(function (body) {
      this.body = body;
      return this;
    }),
    end: jest.fn(),
  };
}
