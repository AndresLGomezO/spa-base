import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  buildEntityRecordsImportExample,
  formatEntityRecordsImportExampleJson,
} from "./build-entity-records-import-example.js";

const definition: SerializableEntityDefinition = {
  name: "product",
  collection: "products",
  permissions: ["product.read"],
  ui: {} as SerializableEntityDefinition["ui"],
  fields: {
    name: { type: "string", required: true, optional: false },
    status: {
      type: "enum",
      required: true,
      optional: false,
      enumValues: ["draft", "published"],
    },
    categoryId: {
      type: "relation",
      required: true,
      optional: false,
      relation: { target: "category", type: "many-to-one" },
    },
    tagIds: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "tag", type: "many-to-many" },
    },
    childItems: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "lineItem", type: "one-to-many" },
    },
  },
} as SerializableEntityDefinition;

describe("buildEntityRecordsImportExample", () => {
  it("includes all importable document fields in the example object", () => {
    const example = buildEntityRecordsImportExample(definition);

    expect(example.document).toMatchObject({
      id: "optional-existing-record-id",
      name: "example-text",
      status: "draft",
      categoryId: "existing-target-record-id",
    });
    expect(example.relations).toEqual({
      tagIds: ["existing-target-record-id"],
    });
  });

  it("documents enum values and relation metadata in field notes", () => {
    const example = buildEntityRecordsImportExample(definition);
    const statusNote = example.fieldNotes.find(
      (note) => note.fieldName === "status",
    );
    const tagNote = example.fieldNotes.find(
      (note) => note.fieldName === "tagIds",
    );
    const childNote = example.fieldNotes.find(
      (note) => note.fieldName === "childItems",
    );

    expect(statusNote?.details).toEqual([
      { kind: "enumValues", values: ["draft", "published"] },
    ]);
    expect(tagNote?.importLocation).toBe("relations");
    expect(childNote?.importLocation).toBe("not-importable");
  });

  it("formats example JSON with relations when present", () => {
    const example = buildEntityRecordsImportExample(definition);
    const json = formatEntityRecordsImportExampleJson(example);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.name).toBe("example-text");
    expect(parsed.relations).toEqual({
      tagIds: ["existing-target-record-id"],
    });
  });
});
