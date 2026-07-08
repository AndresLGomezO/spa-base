import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  resolveActiveView,
  resolveCardView,
  resolveExpandableTableView,
} from "./view-engine.js";

function buildDefinition(
  views: SerializableEntityDefinition["ui"]["views"],
): SerializableEntityDefinition {
  return {
    name: "account",
    collection: "accounts",
    permissions: ["account.read"],
    fields: {
      name: { type: "string", required: true, optional: false },
    },
    ui: {
      views,
      forms: {
        create: { sections: [{ fields: ["name"] }] },
        edit: { sections: [{ fields: ["name"] }] },
      },
    },
  };
}

describe("resolveActiveView", () => {
  it("prefers table view when card is listed first", () => {
    const definition = buildDefinition([
      {
        type: "card",
        name: "card",
        fields: ["name"],
      },
      {
        type: "table",
        name: "default",
        fields: ["name"],
      },
    ]);

    expect(resolveActiveView(definition).type).toBe("table");
  });

  it("returns card view via resolveCardView", () => {
    const definition = buildDefinition([
      { type: "table", name: "default", fields: ["name"] },
      { type: "card", name: "card", fields: ["name"] },
    ]);

    expect(resolveCardView(definition)?.name).toBe("card");
  });
});

describe("resolveExpandableTableView", () => {
  it("synthesizes a default expandable view when only table metadata exists", () => {
    const definition = buildDefinition([
      {
        type: "table",
        name: "default",
        fields: ["name", "status", "amount", "description"],
      },
    ]);

    const view = resolveExpandableTableView({
      ...definition,
      ui: {
        ...definition.ui,
        listViewType: "expandableTable",
      },
    });

    expect(view.type).toBe("expandableTable");
    expect(view.columns).toHaveLength(3);
    expect(view.fields).toEqual(["name", "status", "amount", "description"]);
  });
});
