import { createEmptyLayout } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "../ui/types.js";
import {
  isOneToManyRelationField,
  resolveOneToManyForeignKeyField,
} from "./resolve-one-to-many-foreign-key.js";

function buildDefinition(
  name: string,
  fields: SerializableEntityDefinition["fields"],
): SerializableEntityDefinition {
  return {
    name,
    collection: `${name}s`,
    permissions: [],
    fields,
    ui: {
      views: [],
      forms: {
        create: { layout: createEmptyLayout(1) },
        edit: { layout: createEmptyLayout(1) },
      },
    },
  };
}

describe("resolveOneToManyForeignKeyField", () => {
  it("finds explicit many-to-one field on target entity", () => {
    const workItem = buildDefinition("workItem", {
      title: { type: "string", required: true, optional: false },
      batchId: {
        type: "relation",
        required: false,
        optional: true,
        relation: { target: "batch", type: "many-to-one" },
      },
    });

    expect(resolveOneToManyForeignKeyField("batch", workItem)).toBe("batchId");
  });

  it("uses inverse when provided", () => {
    const workItem = buildDefinition("workItem", {
      batchId: {
        type: "relation",
        required: false,
        optional: true,
        relation: { target: "batch", type: "many-to-one" },
      },
    });

    expect(
      resolveOneToManyForeignKeyField("batch", workItem, {
        inverse: "batchId",
      }),
    ).toBe("batchId");
  });

  it("detects one-to-many relation fields", () => {
    expect(
      isOneToManyRelationField({
        type: "relation",
        relation: { type: "one-to-many", target: "workItem" },
      }),
    ).toBe(true);
    expect(
      isOneToManyRelationField({
        type: "relation",
        relation: { type: "many-to-one", target: "batch" },
      }),
    ).toBe(false);
  });
});
