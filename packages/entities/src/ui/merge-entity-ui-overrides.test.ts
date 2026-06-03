import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import { mergeEntityUiOverrides } from "./merge-entity-ui-overrides.js";
import { normalizeListItemLayout } from "./normalize-list-item-layout.js";
import type { SerializableEntityDefinition } from "./types.js";

const baseDefinition: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { sections: [{ fields: ["name"] }] },
      edit: { sections: [{ fields: ["name"] }] },
    },
  },
};

describe("mergeEntityUiOverrides", () => {
  it("keeps base table view when override only defines card layout", () => {
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [
        {
          type: "card",
          name: "card",
          fields: ["name"],
          layout: createDefaultUiLayout(["name"]),
        },
      ],
    });

    expect(merged.ui.views[0]?.type).toBe("table");
    expect(merged.ui.views[1]?.type).toBe("card");
  });

  it("applies listViewType from override", () => {
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      listViewType: "card",
      views: [
        { type: "table", name: "default", fields: ["name"] },
        {
          type: "card",
          name: "card",
          fields: ["name"],
          layout: createDefaultUiLayout(["name"]),
        },
      ],
    });

    expect(merged.ui.listViewType).toBe("card");
  });

  it("merges listItem, detail, and form layouts", () => {
    const listItem = createDefaultUiLayout(["name"]);
    const detail = createDefaultUiLayout(["name"]);
    const createLayout = createDefaultUiLayout(["name"]);

    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      listItem,
      detail,
      forms: { create: createLayout },
    });

    expect(merged.ui.listItem).toEqual(listItem);
    expect(merged.ui.detailLayout).toEqual(detail);
    expect(merged.ui.forms.create.layout).toEqual(createLayout);
  });
});

describe("normalizeListItemLayout", () => {
  it("prefers top-level listItem over card view layout", () => {
    const topLevel = createDefaultUiLayout(["name"]);
    const cardLayout = createDefaultUiLayout(["other"]);

    expect(
      normalizeListItemLayout({
        listItem: topLevel,
        views: [
          {
            type: "card",
            name: "card",
            fields: ["name"],
            layout: cardLayout,
          },
        ],
      }),
    ).toEqual(topLevel);
  });

  it("falls back to card view layout", () => {
    const cardLayout = createDefaultUiLayout(["name"]);
    expect(
      normalizeListItemLayout({
        views: [
          {
            type: "card",
            name: "card",
            fields: ["name"],
            layout: cardLayout,
          },
        ],
      }),
    ).toEqual(cardLayout);
  });
});
