import { describe, expect, it } from "vitest";

import { resolveEntityCellValue } from "./resolve-entity-cell-value";

describe("resolveEntityCellValue", () => {
  it("uses reverse lookup value for one-to-many columns", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        workItems: {
          type: "relation",
          required: false,
          optional: true,
          relation: { target: "workItem", type: "one-to-many" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1" },
        "workItems",
        definition,
        () => "Item A, Item B",
      ),
    ).toBe("Item A, Item B");
  });

  it("falls back to stored field values for other columns", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1", name: "Batch A" },
        "name",
        definition,
        () => null,
      ),
    ).toBe("Batch A");
  });

  it("keeps plain text with numbers as-is for string fields", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1", name: "test 1" },
        "name",
        definition,
        () => null,
      ),
    ).toBe("test 1");
  });
});
