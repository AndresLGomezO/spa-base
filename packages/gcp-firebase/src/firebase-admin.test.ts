import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFirestore = {
  settings: vi.fn(),
};

const mockApp = { name: "mock-app" };

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => [mockApp]),
  initializeApp: vi.fn(() => mockApp),
  cert: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {},
  getFirestore: vi.fn(() => mockFirestore),
}));

describe("getFirestoreAdmin", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFirestore.settings.mockReset();
    Reflect.deleteProperty(
      globalThis,
      "__repoGcpFirebaseConfiguredFirestoreInstances",
    );
    vi.resetModules();
  });

  it("applies Firestore settings once per instance", async () => {
    const { getFirestoreAdmin } = await import("./firebase-admin.js");
    const config = { projectId: "demo-project" };

    getFirestoreAdmin(config);
    getFirestoreAdmin(config);

    expect(mockFirestore.settings).toHaveBeenCalledTimes(1);
    expect(mockFirestore.settings).toHaveBeenCalledWith({
      ignoreUndefinedProperties: true,
    });
  });

  it("skips settings when another bundle already configured the instance", async () => {
    const { getFirestoreAdmin: getFirestoreAdminFirst } =
      await import("./firebase-admin.js");
    getFirestoreAdminFirst({ projectId: "demo-project" });

    vi.resetModules();

    const { getFirestoreAdmin: getFirestoreAdminSecond } =
      await import("./firebase-admin.js");
    getFirestoreAdminSecond({ projectId: "demo-project" });

    expect(mockFirestore.settings).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate settings errors when global tracking was reset", async () => {
    mockFirestore.settings
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error(
          "Firestore has already been initialized. You can only call settings() once, and only before calling any other methods on a Firestore object.",
        );
      });

    const { getFirestoreAdmin: getFirestoreAdminFirst } =
      await import("./firebase-admin.js");
    getFirestoreAdminFirst({ projectId: "demo-project" });

    Reflect.deleteProperty(
      globalThis,
      "__repoGcpFirebaseConfiguredFirestoreInstances",
    );
    vi.resetModules();

    const { getFirestoreAdmin: getFirestoreAdminSecond } =
      await import("./firebase-admin.js");

    expect(() =>
      getFirestoreAdminSecond({ projectId: "demo-project" }),
    ).not.toThrow();
    expect(mockFirestore.settings).toHaveBeenCalledTimes(2);
  });

  it("rethrows unexpected Firestore settings errors", async () => {
    mockFirestore.settings.mockImplementation(() => {
      throw new Error("permission denied");
    });

    const { getFirestoreAdmin } = await import("./firebase-admin.js");

    expect(() => getFirestoreAdmin({ projectId: "demo-project" })).toThrow(
      "permission denied",
    );
  });
});
