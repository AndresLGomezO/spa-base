import { describe, expect, it } from "vitest";

import { defineEntity } from "./defineEntity.js";
import {
  createEntityRecordsExportEnvelope,
  normalizeEntityRecordsImportInput,
  parseEntityRecordsImportText,
  splitEntityRecordPayload,
  stripEntityRecordSystemFields,
  toPortableEntityRecord,
  validateEntityRecordsImport,
} from "./entity-records-json.js";

const Product = defineEntity({
  name: "product",
  fields: {
    name: { type: "string", required: true },
    status: {
      type: "enum",
      enumValues: ["draft", "published"],
      required: true,
    },
    categoryId: {
      type: "relation",
      required: true,
      relation: { target: "category", type: "many-to-one" },
    },
    tagIds: {
      type: "relation",
      relation: { target: "tag", type: "many-to-many" },
    },
  },
});

describe("entity-records-json", () => {
  it("normalizes a single object import", () => {
    const result = normalizeEntityRecordsImportInput({ name: "Widget" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
    }
  });

  it("normalizes an array import", () => {
    const result = normalizeEntityRecordsImportInput([
      { name: "A" },
      { name: "B" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("splits document and relations payloads", () => {
    const result = splitEntityRecordPayload({
      document: { name: "Widget", status: "draft", categoryId: "cat-1" },
      relations: { tagIds: ["tag-1"] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.documentPayload.name).toBe("Widget");
      expect(result.data.relations.tagIds).toEqual(["tag-1"]);
    }
  });

  it("extracts relations from flat records", () => {
    const result = splitEntityRecordPayload({
      name: "Widget",
      status: "draft",
      categoryId: "cat-1",
      relations: { tagIds: ["tag-1"] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.documentPayload).not.toHaveProperty("relations");
      expect(result.data.relations.tagIds).toEqual(["tag-1"]);
    }
  });

  it("strips system and meta fields", () => {
    const stripped = stripEntityRecordSystemFields({
      id: "abc",
      tenantId: "tenant-1",
      name: "Widget",
      _populated: {},
    });
    expect(stripped).toEqual({ name: "Widget" });
  });

  it("validates enum and required fields", () => {
    const result = validateEntityRecordsImport(Product, [
      {
        name: "Widget",
        status: "invalid",
        categoryId: "cat-1",
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.path.includes("status"))).toBe(
        true,
      );
    }
  });

  it("rejects duplicate ids in the same batch", () => {
    const result = validateEntityRecordsImport(Product, [
      {
        id: "same-id",
        name: "A",
        status: "draft",
        categoryId: "cat-1",
      },
      {
        id: "same-id",
        name: "B",
        status: "published",
        categoryId: "cat-2",
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((error) => error.message.includes("Duplicate")),
      ).toBe(true);
    }
  });

  it("exports portable records with optional relations", () => {
    const portable = toPortableEntityRecord(
      Product,
      {
        id: "prod-1",
        tenantId: "tenant-1",
        name: "Widget",
        status: "draft",
        categoryId: "cat-1",
      },
      { tagIds: ["tag-1", "tag-2"] },
    );
    expect(portable).toEqual({
      id: "prod-1",
      name: "Widget",
      status: "draft",
      categoryId: "cat-1",
      relations: { tagIds: ["tag-1", "tag-2"] },
    });
  });

  it("parses import text and validates create payloads", () => {
    const parsed = parseEntityRecordsImportText(
      JSON.stringify({
        name: "Widget",
        status: "draft",
        categoryId: "cat-1",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const validated = validateEntityRecordsImport(Product, parsed.data);
      expect(validated.ok).toBe(true);
      if (validated.ok) {
        expect(validated.data[0]?.mode).toBe("create");
      }
    }
  });

  it("creates export envelopes", () => {
    const envelope = createEntityRecordsExportEnvelope("product", [
      { id: "prod-1", name: "Widget", status: "draft", categoryId: "cat-1" },
    ]);
    expect(envelope.entityName).toBe("product");
    expect(envelope.records).toHaveLength(1);
  });
});
