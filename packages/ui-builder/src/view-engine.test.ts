import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import { resolveActiveView, resolveCardView } from "./view-engine.js";

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
