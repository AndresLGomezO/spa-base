import { describe, expect, it } from "vitest";

import { uploadTenantLogo, validateStorageObjectId } from "./tenant-storage.js";

describe("validateStorageObjectId", () => {
  it("accepts alphanumeric ids with dashes and underscores", () => {
    expect(validateStorageObjectId("abc-123_test")).toBe(true);
    expect(
      validateStorageObjectId("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(true);
  });

  it("rejects empty, slash, and overlong ids", () => {
    expect(validateStorageObjectId("")).toBe(false);
    expect(validateStorageObjectId("../escape")).toBe(false);
    expect(validateStorageObjectId("a".repeat(129))).toBe(false);
  });
});

const storageEmulatorConfigured = Boolean(
  process.env.FIREBASE_STORAGE_EMULATOR_HOST,
);

const firebaseConfig = {
  projectId: process.env.GCP_PROJECT_ID ?? "demo-project-base",
  storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  storageEmulatorPublicHost:
    process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST ??
    process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  storageBucket:
    process.env.GCP_STORAGE_BUCKET ?? "demo-project-base.appspot.com",
};

// Minimal 1x1 PNG
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!storageEmulatorConfigured)(
  "uploadTenantLogo (Storage emulator)",
  () => {
    it("uploads a logo and returns a browser-accessible emulator URL", async () => {
      const tenantId = `tenant_${Math.random().toString(36).slice(2, 10)}`;
      const objectId = "550e8400-e29b-41d4-a716-446655440000";
      const logoUrl = await uploadTenantLogo({
        config: firebaseConfig,
        tenantId,
        objectId,
        buffer: PNG_BUFFER,
        contentType: "image/png",
      });

      const publicHost =
        firebaseConfig.storageEmulatorPublicHost ??
        firebaseConfig.storageEmulatorHost;
      expect(logoUrl).toContain(`http://${publicHost}/v0/b/`);
      expect(logoUrl).toContain(
        encodeURIComponent(`tenants/${tenantId}/images/${objectId}.png`),
      );
      expect(logoUrl).toContain("?alt=media");
    });
  },
);
