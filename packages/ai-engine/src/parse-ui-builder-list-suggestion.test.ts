import { describe, expect, it } from "vitest";
import {
  createDefaultFormLayout,
  createDefaultUiLayout,
  createEmptyColumn,
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
      listViewType: "table",
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
        listViewType: "table",
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
      listViewType: "table",
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

  it("repairs expandableTable layouts when nested columnCount is wrong", () => {
    const layoutWithBadNestedCount = () => {
      const base = createDefaultUiLayout(["name", "email"]);
      const nested = {
        type: "nested-layout" as const,
        id: "nested-1",
        columnCount: 3,
        columns: [createEmptyColumn(), createEmptyColumn()],
      };
      return {
        ...base,
        root: {
          ...base.root,
          columnCount: 3,
          columns: base.root.columns.map((column, index) =>
            index === 0 ? { ...column, rows: [nested] } : column,
          ),
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
            cellLayout: layoutWithBadNestedCount(),
          },
        ],
        rowExpandLayout: layoutWithBadNestedCount(),
        showActions: true,
      },
    });

    const cellNested =
      normalized?.expandableTable.columns[0]?.cellLayout.root.columns[0]
        ?.rows[0];
    expect(cellNested?.type).toBe("nested-layout");
    if (cellNested?.type === "nested-layout") {
      expect(cellNested.columnCount).toBe(2);
    }

    const expandNested =
      normalized?.expandableTable.rowExpandLayout.root.columns[0]?.rows[0];
    expect(expandNested?.type).toBe("nested-layout");
    if (expandNested?.type === "nested-layout") {
      expect(expandNested.columnCount).toBe(2);
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
          listViewType: "table",
          table: { fields: ["name", "email"], showActions: true },
        },
      }),
      extractJsonFromModelAnswer,
    );

    expect(result.status).toBe("ready");
    expect(result.listViewType).toBe("table");
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
          listViewType: "table",
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

  it("accepts expandableTable output when nested columnCount is wrong", () => {
    const layoutWithBadNestedCount = () => {
      const base = createDefaultUiLayout(["name", "email"]);
      const nested = {
        type: "nested-layout" as const,
        id: "nested-1",
        columnCount: 3,
        columns: [createEmptyColumn(), createEmptyColumn()],
      };
      return {
        ...base,
        root: {
          ...base.root,
          columnCount: 3,
          columns: base.root.columns.map((column, index) =>
            index === 0 ? { ...column, rows: [nested] } : column,
          ),
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
                cellLayout: layoutWithBadNestedCount(),
              },
            ],
            rowExpandLayout: layoutWithBadNestedCount(),
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
