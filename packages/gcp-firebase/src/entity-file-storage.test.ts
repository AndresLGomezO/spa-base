import { describe, expect, it } from "vitest";

import {
  createEntityFileDownloadUrl,
  createStableEntityFileObjectId,
  generateEntityFileObjectId,
  uploadEntityFile,
  validateEntityFileContentType,
} from "./entity-file-storage.js";
import { validateStorageObjectId } from "./tenant-storage.js";

describe("validateEntityFileContentType", () => {
  it("accepts image MIME types for image fields", () => {
    expect(validateEntityFileContentType("image", "image/png")).toBe(true);
    expect(validateEntityFileContentType("image", "application/pdf")).toBe(
      false,
    );
  });

  it("accepts PDF for document fields", () => {
    expect(validateEntityFileContentType("document", "application/pdf")).toBe(
      true,
    );
    expect(validateEntityFileContentType("document", "image/png")).toBe(false);
  });
});

describe("validateStorageObjectId", () => {
  it("rejects invalid object ids for entity uploads", () => {
    expect(validateStorageObjectId("../escape")).toBe(false);
  });
});

describe("entity file object ids", () => {
  it("generateEntityFileObjectId returns a UUID", () => {
    expect(generateEntityFileObjectId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("createStableEntityFileObjectId is deterministic and filename-safe", () => {
    const first = createStableEntityFileObjectId(
      "rates/bank/bank_bancolombia/logo",
    );
    const second = createStableEntityFileObjectId(
      "rates/bank/bank_bancolombia/logo",
    );
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(validateStorageObjectId(first)).toBe(true);
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

const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!storageEmulatorConfigured)(
  "uploadEntityFile (Storage emulator)",
  () => {
    it("uploads an entity image and returns a storage reference", async () => {
      const tenantId = `tenant_${Math.random().toString(36).slice(2, 10)}`;
      const objectId = "550e8400-e29b-41d4-a716-446655440001";
      const file = await uploadEntityFile({
        config: firebaseConfig,
        tenantId,
        entityName: "company",
        fieldName: "logo",
        fieldType: "image",
        objectId,
        buffer: PNG_BUFFER,
        contentType: "image/png",
        fileName: "logo.png",
        uploadedBy: "user-1",
      });

      expect(file.storagePath).toBe(
        `tenants/${tenantId}/entity-files/company/${objectId}.png`,
      );
      expect(file.contentType).toBe("image/png");
      expect(file.fileName).toBe("logo.png");

      const downloadUrl = await createEntityFileDownloadUrl({
        config: firebaseConfig,
        storagePath: file.storagePath,
      });
      const publicHost =
        firebaseConfig.storageEmulatorPublicHost ??
        firebaseConfig.storageEmulatorHost;
      expect(downloadUrl).toContain(`http://${publicHost}/v0/b/`);
      expect(downloadUrl).toContain(encodeURIComponent(file.storagePath));
    });
  },
);
