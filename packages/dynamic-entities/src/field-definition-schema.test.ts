import { describe, expect, it } from "vitest";

import {
  entityDefinitionRecordSchema,
  fieldDefinitionSchema,
} from "./types.js";

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

describe("fieldDefinitionSchema array fields", () => {
  it("accepts isArray on eligible scalar types", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "tags",
      type: "string",
      isArray: true,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects isArray on relation fields", () => {
    const parsed = fieldDefinitionSchema.safeParse({
      name: "related",
      type: "relation",
      isArray: true,
      relation: { target: "customer", type: "many-to-one" },
    });

    expect(parsed.success).toBe(false);
  });
});

describe("entityDefinitionRecordSchema displayField", () => {
  it("rejects displayField pointing at an array field", () => {
    const parsed = entityDefinitionRecordSchema.safeParse({
      id: "def_1",
      tenantId: "tenant_a",
      name: "article",
      label: "Articles",
      displayField: "tags",
      fields: [{ name: "tags", type: "string", isArray: true, required: true }],
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });
});
