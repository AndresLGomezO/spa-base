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

  it("merges listItem, mainPage, recordDetail, and form layouts", () => {
    const listItem = createDefaultUiLayout(["name"]);
    const mainPage = createDefaultUiLayout(["name"]);
    const recordDetail = createDefaultUiLayout(["name"]);
    const createLayout = createDefaultUiLayout(["name"]);

    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      listItem,
      mainPage,
      recordDetail,
      forms: { create: createLayout },
    });

    expect(merged.ui.listItem).toEqual(listItem);
    expect(merged.ui.mainPageLayout).toEqual(mainPage);
    expect(merged.ui.recordDetailLayout).toEqual(recordDetail);
    expect(merged.ui.forms.create.layout).toEqual(createLayout);
  });

  it("applies forms.modalSize", () => {
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "widget",
      views: baseDefinition.ui.views,
      forms: { modalSize: "xl" },
      updatedAt: new Date().toISOString(),
    });

    expect(merged.ui.forms.modalSize).toBe("xl");
  });

  it("applies forms.modalChrome and modalFooterLayout", () => {
    const footerLayout = createDefaultUiLayout(["name"]);
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "widget",
      views: baseDefinition.ui.views,
      forms: {
        modalChrome: { showHeader: false, contentPadding: "none" },
        modalFooterLayout: footerLayout,
      },
      updatedAt: new Date().toISOString(),
    });

    expect(merged.ui.forms.modalChrome).toEqual({
      showHeader: false,
      contentPadding: "none",
    });
    expect(merged.ui.forms.modalFooterLayout).toEqual(footerLayout);
  });

  it("applies unified forms.layout to both create and edit", () => {
    const shared = createDefaultUiLayout(["name"]);
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      forms: { layout: shared, presentation: "plain" },
    });

    expect(merged.ui.forms.create.layout).toEqual(shared);
    expect(merged.ui.forms.edit.layout).toEqual(shared);
    expect(merged.ui.forms.presentation).toBe("plain");
  });

  it("merges wizard presentation and config", () => {
    const wizard = {
      shellLayout: createDefaultUiLayout(["name"]),
      steps: [
        {
          id: "step-1",
          label: "Details",
          layout: createDefaultUiLayout(["name"]),
        },
      ],
    };
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      forms: { presentation: "wizard", wizard },
    });

    expect(merged.ui.forms.presentation).toBe("wizard");
    expect(merged.ui.forms.wizard).toEqual(wizard);
  });

  it("migrates legacy detail override to recordDetailLayout", () => {
    const legacyDetail = createDefaultUiLayout(["name"]);
    const merged = mergeEntityUiOverrides(baseDefinition, {
      entityName: "account",
      updatedAt: new Date().toISOString(),
      views: [{ type: "table", name: "default", fields: ["name"] }],
      detail: legacyDetail,
    });

    expect(merged.ui.recordDetailLayout).toEqual(legacyDetail);
    expect(merged.ui.detailLayout).toEqual(legacyDetail);
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
