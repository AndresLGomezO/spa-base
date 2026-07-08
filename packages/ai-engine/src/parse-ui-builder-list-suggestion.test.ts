import { describe, expect, it } from "vitest";
import {
  asEditableLayoutRoot,
  createDefaultFormLayout,
  createDefaultUiLayout,
  createLayoutId,
  isContainerComponent,
  isGridComponent,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

import { defineEntity } from "@repo/entities";
import {
  createDesignLayoutSliceEnvelope,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import { normalizeAiListSliceSuggestion } from "./normalize-ai-list-slice-suggestion.js";
import { parseUiBuilderListSuggestion } from "./parse-ui-builder-list-suggestion.js";
import { extractJsonFromModelAnswer } from "./extract-json-from-model-answer.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email"],
      },
    ],
    forms: {
      create: {
        layout: createDefaultFormLayout(["name", "email"]),
      },
      edit: {
        layout: createDefaultFormLayout(["name", "email"]),
      },
    },
  },
});

const entity = Widget as unknown as AnyDefinedEntity;

describe("normalizeAiListSliceSuggestion", () => {
  it("merges card-only AI output with stub companions", () => {
    const cardLayout = createDefaultUiLayout(["name", "email"]);
    const normalized = normalizeAiListSliceSuggestion(entity, {
      kind: "design-layout-slice",
      surface: "list",
      version: 1,
      data: {
        listViewType: "card",
        listItem: cardLayout,
      },
    });

    expect(normalized?.listViewType).toBe("card");
    expect(normalized?.listItem).toEqual(cardLayout);
    expect(normalized?.table.fields).toEqual(["name", "email"]);
    expect(normalized?.expandableTable.columns.length).toBeGreaterThan(0);
  });

  it("preserves fallback branches for non-selected presentation", () => {
    const fallbackLayout = createDefaultUiLayout(["name"]);
    const fallbackEnvelope = createDesignLayoutSliceEnvelope("list", {
      listViewType: "expandableTable",
      table: { fields: ["name"], showActions: false },
      expandableTable: {
        columns: [{ id: "col-fallback", cellLayout: fallbackLayout }],
        rowExpandLayout: fallbackLayout,
        showActions: false,
      },
    });

    const normalized = normalizeAiListSliceSuggestion(
      entity,
      {
        listViewType: "expandableTable",
        table: { fields: ["name", "email"], showActions: true },
      },
      JSON.stringify(fallbackEnvelope),
    );

    expect(normalized?.table.fields).toEqual(["name", "email"]);
    expect(normalized?.expandableTable.columns[0]?.id).toBe("col-fallback");
  });

  it("drops entity-name paths mistakenly used as table fields", () => {
    const contractEntity = defineEntity({
      name: "contract",
      fields: {
        name: { type: "string", required: true },
        contractType: { type: "string" },
        categoryId: { type: "string" },
      },
      ui: {
        nav: { label: "Contracts", icon: "box" },
        views: [
          {
            type: "table",
            name: "default",
            fields: ["name", "contractType", "categoryId"],
          },
        ],
        forms: {
          create: {
            layout: createDefaultFormLayout([
              "name",
              "contractType",
              "categoryId",
            ]),
          },
          edit: {
            layout: createDefaultFormLayout([
              "name",
              "contractType",
              "categoryId",
            ]),
          },
        },
      },
    }) as unknown as AnyDefinedEntity;

    const normalized = normalizeAiListSliceSuggestion(contractEntity, {
      listViewType: "expandableTable",
      table: {
        fields: ["contract", "name", "contractType", "categoryId"],
        showActions: true,
      },
    });

    expect(normalized?.table.fields).toEqual([
      "name",
      "contractType",
      "categoryId",
    ]);
  });

  it("repairs expandableTable layouts when grid track count is wrong", () => {
    const layoutWithBadGridTracks = () => {
      const base = createDefaultUiLayout(["name", "email"]);
      const editableRoot = asEditableLayoutRoot(base.root);
      const gridRow = {
        type: "component" as const,
        id: "grid-1",
        component: {
          kind: "grid" as const,
          gridTemplateColumns: "repeat(3, 1fr)",
          rows: [
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: { kind: "container" as const, rows: [] },
            },
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: { kind: "container" as const, rows: [] },
            },
          ],
        },
      };
      return {
        ...base,
        root: {
          ...editableRoot,
          columnCount: 1,
          columns: [{ ...editableRoot.columns[0]!, rows: [gridRow] }],
        },
      };
    };

    const normalized = normalizeAiListSliceSuggestion(entity, {
      listViewType: "expandableTable",
      expandableTable: {
        columns: [
          {
            id: "col-1",
            label: "Main",
            cellLayout: layoutWithBadGridTracks(),
          },
        ],
        rowExpandLayout: layoutWithBadGridTracks(),
        showActions: true,
      },
    });

    const cellLayout = normalized?.expandableTable.columns[0]?.cellLayout;
    const cellContainer = cellLayout
      ? resolveLayoutRootColumns(cellLayout)[0]?.rows[0]
      : undefined;
    expect(cellContainer?.type).toBe("component");
    if (
      cellContainer?.type === "component" &&
      isContainerComponent(cellContainer.component)
    ) {
      const cellGrid = cellContainer.component.rows[0];
      expect(cellGrid?.type).toBe("component");
      if (
        cellGrid?.type === "component" &&
        isGridComponent(cellGrid.component)
      ) {
        expect(cellGrid.component.rows).toHaveLength(2);
      }
    }

    const rowExpandLayout = normalized?.expandableTable.rowExpandLayout;
    const expandContainer = rowExpandLayout
      ? resolveLayoutRootColumns(rowExpandLayout)[0]?.rows[0]
      : undefined;
    expect(expandContainer?.type).toBe("component");
    if (
      expandContainer?.type === "component" &&
      isContainerComponent(expandContainer.component)
    ) {
      const expandGrid = expandContainer.component.rows[0];
      expect(expandGrid?.type).toBe("component");
      if (
        expandGrid?.type === "component" &&
        isGridComponent(expandGrid.component)
      ) {
        expect(expandGrid.component.rows).toHaveLength(2);
      }
    }
  });
});

describe("parseUiBuilderListSuggestion", () => {
  it("returns ready suggestion for table-only AI JSON", () => {
    const result = parseUiBuilderListSuggestion(
      entity,
      JSON.stringify({
        kind: "design-layout-slice",
        surface: "list",
        version: 1,
        data: {
          listViewType: "expandableTable",
          table: { fields: ["name", "email"], showActions: true },
        },
      }),
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("ready");
    expect(result.listViewType).toBe("expandableTable");
    expect(result.sliceData?.table?.fields).toEqual(["name", "email"]);
  });

  it("returns ready suggestion for card-only AI JSON", () => {
    const cardLayout = createDefaultUiLayout(["name", "email"]);
    const result = parseUiBuilderListSuggestion(
      entity,
      JSON.stringify({
        kind: "design-layout-slice",
        surface: "list",
        version: 1,
        data: {
          listViewType: "card",
          listItem: cardLayout,
        },
      }),
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("ready");
    expect(result.listViewType).toBe("card");
    expect(result.sliceData?.listItem).toEqual(cardLayout);
  });

  it("accepts table output when entity name was incorrectly used as a field", () => {
    const contractEntity = defineEntity({
      name: "contract",
      fields: {
        name: { type: "string", required: true },
        contractType: { type: "string" },
        categoryId: { type: "string" },
      },
      ui: {
        nav: { label: "Contracts", icon: "box" },
        views: [
          {
            type: "table",
            name: "default",
            fields: ["name", "contractType", "categoryId"],
          },
        ],
        forms: {
          create: {
            layout: createDefaultFormLayout([
              "name",
              "contractType",
              "categoryId",
            ]),
          },
          edit: {
            layout: createDefaultFormLayout([
              "name",
              "contractType",
              "categoryId",
            ]),
          },
        },
      },
    }) as unknown as AnyDefinedEntity;

    const result = parseUiBuilderListSuggestion(
      contractEntity,
      JSON.stringify({
        kind: "design-layout-slice",
        surface: "list",
        version: 1,
        data: {
          listViewType: "expandableTable",
          table: {
            fields: ["contract", "name", "contractType", "categoryId"],
            showActions: true,
          },
        },
      }),
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("ready");
    expect(result.sliceData?.table?.fields).toEqual([
      "name",
      "contractType",
      "categoryId",
    ]);
  });

  it("accepts expandableTable output when grid track count is wrong", () => {
    const layoutWithBadGridTracks = () => {
      const base = createDefaultUiLayout(["name", "email"]);
      const editableRoot = asEditableLayoutRoot(base.root);
      const gridRow = {
        type: "component" as const,
        id: "grid-1",
        component: {
          kind: "grid" as const,
          gridTemplateColumns: "repeat(3, 1fr)",
          rows: [
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: { kind: "container" as const, rows: [] },
            },
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: { kind: "container" as const, rows: [] },
            },
          ],
        },
      };
      return {
        ...base,
        root: {
          ...editableRoot,
          columnCount: 1,
          columns: [{ ...editableRoot.columns[0]!, rows: [gridRow] }],
        },
      };
    };

    const result = parseUiBuilderListSuggestion(
      entity,
      JSON.stringify({
        kind: "design-layout-slice",
        surface: "list",
        version: 1,
        data: {
          listViewType: "expandableTable",
          expandableTable: {
            columns: [
              {
                id: "col-1",
                label: "Main",
                cellLayout: layoutWithBadGridTracks(),
              },
            ],
            rowExpandLayout: layoutWithBadGridTracks(),
            showActions: true,
          },
        },
      }),
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("ready");
    expect(result.listViewType).toBe("expandableTable");
  });

  it("returns failed suggestion when JSON is invalid", () => {
    const result = parseUiBuilderListSuggestion(
      entity,
      "not json",
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("failed");
    expect(result.validationErrors?.length).toBeGreaterThan(0);
    expect(result.rawAnswer).toBe("not json");
  });
});
