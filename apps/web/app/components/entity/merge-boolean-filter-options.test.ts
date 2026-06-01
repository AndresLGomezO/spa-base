import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import { mergeBooleanFilterOptions } from "./merge-boolean-filter-options";

const definition = {
  name: "widget",
  collection: "widgets",
  permissions: ["widget.read"],
  fields: {
    active: { type: "boolean", required: false, optional: true },
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["active", "name"] }],
    forms: {
      create: { sections: [{ fields: ["active", "name"] }] },
      edit: { sections: [{ fields: ["active", "name"] }] },
    },
    fields: {
      active: { filterable: true },
      name: { filterable: true },
    },
  },
} as SerializableEntityDefinition;

describe("mergeBooleanFilterOptions", () => {
  it("adds true/false options for filterable boolean columns", () => {
    const result = mergeBooleanFilterOptions(
      definition,
      [
        { id: "active", filterable: true },
        { id: "name", filterable: true },
      ],
      {},
      { trueLabel: "Yes", falseLabel: "No" },
    );

    expect(result.active).toEqual([
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ]);
    expect(result.name).toBeUndefined();
  });

  it("skips boolean columns that are not filterable", () => {
    const result = mergeBooleanFilterOptions(
      definition,
      [{ id: "active", filterable: false }],
      {},
      { trueLabel: "Yes", falseLabel: "No" },
    );

    expect(result.active).toBeUndefined();
  });
});
