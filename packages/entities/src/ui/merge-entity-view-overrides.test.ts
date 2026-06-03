import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import { mergeEntityViewOverrides } from "./merge-entity-view-overrides.js";
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

describe("mergeEntityViewOverrides", () => {
  it("keeps base table view when override only defines card layout", () => {
    const merged = mergeEntityViewOverrides(baseDefinition, {
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
    const merged = mergeEntityViewOverrides(baseDefinition, {
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
});
