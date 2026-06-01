import { describe, expect, it } from "vitest";

import { syncEntityDefinitionUiWithFields } from "./sync-entity-definition-ui.js";

describe("syncEntityDefinitionUiWithFields", () => {
  it("appends new fields to forms, table view, and field ui metadata", () => {
    const synced = syncEntityDefinitionUiWithFields({
      label: "Product Snapshots",
      fields: [
        { name: "productId", type: "relation" },
        { name: "date", type: "date" },
        { name: "statement", type: "document", ui: { label: "Statement" } },
      ],
      ui: {
        nav: { label: "Product Snapshots", icon: "Camera" },
        views: [
          {
            type: "table",
            name: "default",
            fields: ["productId", "date"],
          },
        ],
        forms: {
          create: { sections: [{ fields: ["productId", "date"] }] },
          edit: { sections: [{ fields: ["productId", "date"] }] },
        },
        fields: {
          productId: { component: "relation", order: 0 },
          date: { component: "date", order: 1 },
        },
      },
    });

    expect(synced.forms?.create.sections[0]?.fields).toEqual([
      "productId",
      "date",
      "statement",
    ]);
    expect(synced.forms?.edit.sections[0]?.fields).toEqual([
      "productId",
      "date",
      "statement",
    ]);
    expect(synced.views?.[0]?.fields).toEqual([
      "productId",
      "date",
      "statement",
    ]);
    expect(synced.fields?.statement).toMatchObject({
      component: "document",
      label: "Statement",
    });
  });
});
