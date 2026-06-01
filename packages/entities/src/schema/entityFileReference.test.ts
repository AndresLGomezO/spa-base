import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import {
  documentFileReferenceSchema,
  imageFileReferenceSchema,
  stripDownloadUrlFromFileReference,
} from "../schema/entityFileReference.js";

describe("entity file reference schemas", () => {
  const validImageReference = {
    storagePath: "tenants/t1/entity-files/company/logo-id.png",
    contentType: "image/png",
    fileName: "logo.png",
  };

  it("accepts valid image references", () => {
    expect(
      imageFileReferenceSchema.safeParse(validImageReference).success,
    ).toBe(true);
  });

  it("accepts enriched image references by stripping downloadUrl", () => {
    expect(
      imageFileReferenceSchema.safeParse({
        ...validImageReference,
        downloadUrl: "https://example.com/file",
      }).success,
    ).toBe(true);
  });

  it("rejects pdf content type on image schema", () => {
    expect(
      imageFileReferenceSchema.safeParse({
        ...validImageReference,
        contentType: "application/pdf",
      }).success,
    ).toBe(false);
  });

  it("accepts valid document references", () => {
    expect(
      documentFileReferenceSchema.safeParse({
        storagePath: "tenants/t1/entity-files/company/doc-id.pdf",
        contentType: "application/pdf",
        fileName: "contract.pdf",
      }).success,
    ).toBe(true);
  });

  it("strips downloadUrl from enriched references", () => {
    expect(
      stripDownloadUrlFromFileReference({
        ...validImageReference,
        downloadUrl: "https://example.com/file",
      }),
    ).toEqual(validImageReference);
  });
});

describe("image and document field types", () => {
  const entity = defineEntity({
    name: "asset",
    fields: {
      logo: { type: "image", required: true },
      contract: { type: "document" },
    },
  });

  it("validates create payloads with file references", () => {
    const parsed = entity.createSchema.safeParse({
      logo: {
        storagePath: "tenants/t1/entity-files/asset/logo-id.png",
        contentType: "image/png",
        fileName: "logo.png",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts create payloads with enriched file references", () => {
    const parsed = entity.createSchema.safeParse({
      logo: {
        storagePath: "tenants/t1/entity-files/asset/logo-id.png",
        contentType: "image/png",
        fileName: "logo.png",
        downloadUrl: "https://example.com/file",
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.logo).toEqual({
        storagePath: "tenants/t1/entity-files/asset/logo-id.png",
        contentType: "image/png",
        fileName: "logo.png",
      });
    }
  });

  it("rejects unknown keys on file references after stripping downloadUrl", () => {
    const parsed = entity.createSchema.safeParse({
      logo: {
        storagePath: "tenants/t1/entity-files/asset/logo-id.png",
        contentType: "image/png",
        fileName: "logo.png",
        downloadUrl: "https://example.com/file",
        extra: "nope",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
