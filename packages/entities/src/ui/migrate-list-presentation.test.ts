import {
  createDefaultFormLayout,
  createDefaultUiLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { migrateListPresentation } from "./migrate-list-presentation.js";
import type { EntityUIConfig } from "./types.js";

function baseUi(overrides: Partial<EntityUIConfig> = {}): EntityUIConfig {
  return {
    views: [
      { type: "table", name: "default", fields: ["name", "balance"] },
      { type: "card", name: "card", fields: ["name", "balance"] },
    ],
    forms: {
      create: { layout: createDefaultFormLayout(["name"]) },
      edit: { layout: createDefaultFormLayout(["name"]) },
    },
    ...overrides,
  };
}

describe("migrateListPresentation", () => {
  it("maps compact listViewType to expandableTable", () => {
    const migrated = migrateListPresentation(
      baseUi({ listViewType: "compact" as EntityUIConfig["listViewType"] }),
    );
    expect(migrated.listViewType).toBe("expandableTable");
  });

  it("seeds expandableTable view from listItem when compact and no expandable view", () => {
    const listItem = createDefaultUiLayout(["name", "balance"]);
    const migrated = migrateListPresentation(
      baseUi({
        listViewType: "compact" as EntityUIConfig["listViewType"],
        listItem,
      }),
    );

    const expandable = migrated.views.find(
      (view) => view.type === "expandableTable",
    );
    expect(expandable?.type).toBe("expandableTable");
    if (expandable?.type === "expandableTable") {
      expect(expandable.columns.length).toBeGreaterThan(0);
      expect(expandable.rowExpandLayout).toBeDefined();
    }
  });
});
