import { describe, expect, it } from "vitest";

import { fieldDefinitionSchema } from "./types.js";

describe("fieldDefinitionSchema file metadata", () => {
  it("accepts maxSizeBytes and defaultImage on image fields", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "logo",
      type: "image",
      maxSizeBytes: 2_097_152,
      defaultImage: {
        storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
        contentType: "image/png",
        fileName: "logo.png",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects defaultImage on document fields", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "brochure",
      type: "document",
      defaultImage: {
        storagePath: "tenants/t1/entity-files/brand/field-default-brochure.pdf",
        contentType: "application/pdf",
        fileName: "brochure.pdf",
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("strips downloadUrl from defaultImage before validation", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "logo",
      type: "image",
      defaultImage: {
        storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
        contentType: "image/png",
        fileName: "logo.png",
        downloadUrl: "https://example.com/file",
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.defaultImage).toEqual({
        storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
        contentType: "image/png",
        fileName: "logo.png",
      });
    }
  });

  it("rejects maxSizeBytes on string fields", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "title",
      type: "string",
      maxSizeBytes: 1024,
    });

    expect(parsed.success).toBe(false);
  });
});
