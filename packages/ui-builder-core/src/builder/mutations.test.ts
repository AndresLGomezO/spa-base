import { describe, expect, it } from "vitest";

import { createLayoutId } from "./id.js";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyColumn,
  createEmptyLayout,
  insertComponentRowAt,
  insertNestedLayoutRowAt,
  moveRootColumn,
  replaceComponentRowAt,
  replaceLayoutDocument,
  replaceNestedLayoutRowAt,
  setRootColumnCount,
  setRootColumnWidthPercent,
  updateComponentRowMetaAt,
  updateRootColumnDisplayRange,
} from "./mutations.js";

describe("addComponentRowAt", () => {
  it("adds a component to the third nested column at the root level", () => {
    const layout = createEmptyLayout(1);
    const nestedRowId = createLayoutId("nested");
    const nested: (typeof layout.root.columns)[0]["rows"][0] = {
      type: "nested-layout",
      id: nestedRowId,
      columnCount: 3,
      columns: [createEmptyColumn(), createEmptyColumn(), createEmptyColumn()],
    };

    const withNested = {
      ...layout,
      root: {
        ...layout.root,
        columns: [{ ...layout.root.columns[0]!, rows: [nested] }],
      },
    };

    const next = addComponentRowAt(
      withNested,
      {
        scope: "nested",
        columnIndex: 0,
        rowId: nestedRowId,
        nestedColumnIndex: 2,
      },
      createDefaultComponent("text", "name"),
    );

    expect(next.root.columns[0]?.rows[0]).toMatchObject({
      type: "nested-layout",
      columns: [
        { rows: [] },
        { rows: [] },
        { rows: [{ type: "component", component: { kind: "text" } }] },
      ],
    });
  });

  it("adds a component when the nested layout is inside another nested column", () => {
    const layout = createEmptyLayout(1);
    const outerNestedId = createLayoutId("nested_outer");
    const innerNestedId = createLayoutId("nested_inner");

    const innerNested = {
      type: "nested-layout" as const,
      id: innerNestedId,
      columnCount: 3,
      columns: [createEmptyColumn(), createEmptyColumn(), createEmptyColumn()],
    };

    const outerNested = {
      type: "nested-layout" as const,
      id: outerNestedId,
      columnCount: 2,
      columns: [
        createEmptyColumn(),
        { ...createEmptyColumn(), rows: [innerNested] },
      ],
    };

    const withNested = {
      ...layout,
      root: {
        ...layout.root,
        columns: [{ ...layout.root.columns[0]!, rows: [outerNested] }],
      },
    };

    const next = addComponentRowAt(
      withNested,
      {
        scope: "nested",
        columnIndex: 0,
        rowId: innerNestedId,
        nestedColumnIndex: 2,
      },
      createDefaultComponent("text", "balance"),
    );

    const outer = next.root.columns[0]?.rows[0];
    expect(outer?.type).toBe("nested-layout");
    if (outer?.type !== "nested-layout") {
      return;
    }

    const inner = outer.columns[1]?.rows[0];
    expect(inner?.type).toBe("nested-layout");
    if (inner?.type !== "nested-layout") {
      return;
    }

    expect(inner.columns[2]?.rows).toHaveLength(1);
    expect(inner.columns[2]?.rows[0]).toMatchObject({
      type: "component",
      component: { kind: "text", primary: { path: "balance" } },
    });
  });
});

describe("insertComponentRowAt", () => {
  it("inserts before the first row in a column", () => {
    let layout = createEmptyLayout(1);
    const first = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      createDefaultComponent("form-field", "name"),
    );
    layout = first.layout;
    const firstRowId = first.rowId;

    const second = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "before", referenceRowId: firstRowId },
      createDefaultComponent("text", "email"),
    );

    const rows = second.layout.root.columns[0]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(second.rowId);
    expect(rows[1]?.id).toBe(firstRowId);
  });

  it("inserts after a row in a column", () => {
    let layout = createEmptyLayout(1);
    const first = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      createDefaultComponent("form-field", "name"),
    );
    layout = first.layout;

    const second = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after", referenceRowId: first.rowId },
      createDefaultComponent("text", "email"),
    );

    const rows = second.layout.root.columns[0]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(first.rowId);
    expect(rows[1]?.id).toBe(second.rowId);
  });

  it("prepends into an empty column when inserting before without reference", () => {
    const layout = createEmptyLayout(1);
    const result = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "before" },
      createDefaultComponent("text", "name"),
    );

    const rows = result.layout.root.columns[0]?.rows ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(result.rowId);
  });

  it("inserts into a nested column at the requested position", () => {
    const layout = createEmptyLayout(1);
    const nestedRowId = createLayoutId("nested");
    const nested = {
      type: "nested-layout" as const,
      id: nestedRowId,
      columnCount: 2,
      columns: [createEmptyColumn(), createEmptyColumn()],
    };

    const withNested = {
      ...layout,
      root: {
        ...layout.root,
        columns: [{ ...layout.root.columns[0]!, rows: [nested] }],
      },
    };

    const first = insertComponentRowAt(
      withNested,
      {
        scope: "nested",
        columnIndex: 0,
        rowId: nestedRowId,
        nestedColumnIndex: 1,
      },
      { position: "after" },
      createDefaultComponent("text", "name"),
    );

    const second = insertComponentRowAt(
      first.layout,
      {
        scope: "nested",
        columnIndex: 0,
        rowId: nestedRowId,
        nestedColumnIndex: 1,
      },
      { position: "before", referenceRowId: first.rowId },
      createDefaultComponent("badge", "status"),
    );

    const outer = second.layout.root.columns[0]?.rows[0];
    expect(outer?.type).toBe("nested-layout");
    if (outer?.type !== "nested-layout") {
      return;
    }

    const rows = outer.columns[1]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(second.rowId);
    expect(rows[1]?.id).toBe(first.rowId);
  });
});

describe("insertNestedLayoutRowAt", () => {
  it("inserts a nested layout row before a reference row", () => {
    let layout = createEmptyLayout(1);
    const component = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      createDefaultComponent("text", "name"),
    );
    layout = component.layout;

    const nested = insertNestedLayoutRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "before", referenceRowId: component.rowId },
      2,
    );

    const rows = nested.layout.root.columns[0]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(nested.rowId);
    expect(rows[0]).toMatchObject({ type: "nested-layout", columnCount: 2 });
    expect(rows[1]?.id).toBe(component.rowId);
  });
});

describe("setRootColumnWidthPercent", () => {
  it("sets explicit width on a column", () => {
    const layout = createEmptyLayout(2);
    const next = setRootColumnWidthPercent(layout, 0, 20);
    expect(next.root.columns[0]?.widthPercent).toBe(20);
    expect(next.root.columns[1]?.widthPercent).toBeUndefined();
  });

  it("clamps width when other columns are auto", () => {
    const layout = setRootColumnWidthPercent(createEmptyLayout(3), 0, 80);
    const next = setRootColumnWidthPercent(layout, 1, 50);
    expect(next.root.columns[1]?.widthPercent).toBe(20);
  });

  it("clears explicit width when percent is undefined", () => {
    const layout = setRootColumnWidthPercent(createEmptyLayout(2), 0, 30);
    const next = setRootColumnWidthPercent(layout, 0, undefined);
    expect(next.root.columns[0]?.widthPercent).toBeUndefined();
  });
});

describe("updateRootColumnDisplayRange", () => {
  it("sets displayFrom and displayTo on a root column", () => {
    const layout = createEmptyLayout(2);
    const next = updateRootColumnDisplayRange(layout, 1, {
      displayFrom: "md",
      displayTo: "xl",
    });
    expect(next.root.columns[1]?.displayFrom).toBe("md");
    expect(next.root.columns[1]?.displayTo).toBe("xl");
  });

  it("strips display range when set to all screens", () => {
    let layout = updateRootColumnDisplayRange(createEmptyLayout(1), 0, {
      displayFrom: "base",
      displayTo: "xl",
    });
    layout = updateRootColumnDisplayRange(layout, 0, {
      displayFrom: "base",
      displayTo: "xl",
    });
    expect(layout.root.columns[0]?.displayFrom).toBeUndefined();
    expect(layout.root.columns[0]?.displayTo).toBeUndefined();
  });
});

describe("moveRootColumn", () => {
  it("swaps widthPercent between columns", () => {
    let layout = createEmptyLayout(2);
    layout = setRootColumnWidthPercent(layout, 0, 25);
    layout = setRootColumnWidthPercent(layout, 1, 75);
    const next = moveRootColumn(layout, 0, 1);
    expect(next.root.columns[0]?.widthPercent).toBe(75);
    expect(next.root.columns[1]?.widthPercent).toBe(25);
  });
});

describe("setRootColumnCount", () => {
  it("clears width percents when column count decreases", () => {
    let layout = createEmptyLayout(3);
    layout = setRootColumnWidthPercent(layout, 0, 20);
    layout = setRootColumnWidthPercent(layout, 1, 30);
    const next = setRootColumnCount(layout, 2);
    expect(next.root.columns[0]?.widthPercent).toBeUndefined();
    expect(next.root.columns[1]?.widthPercent).toBeUndefined();
  });
});

describe("replaceLayoutDocument", () => {
  it("replaces the layout with regenerated ids", () => {
    const base = createEmptyLayout(2);
    const imported = {
      ...base,
      root: {
        ...base.root,
        columns: [
          {
            ...base.root.columns[0]!,
            rows: [
              {
                type: "component" as const,
                id: "imported-row",
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
          ...base.root.columns.slice(1),
        ],
      },
    };

    const next = replaceLayoutDocument(imported);
    expect(next.root.columnCount).toBe(2);
    expect(next.root.columns[0]?.rows[0]?.id).not.toBe("imported-row");
  });
});

describe("replaceComponentRowAt", () => {
  it("replaces a component row while preserving row id", () => {
    const layout = createEmptyLayout(1);
    const rowId = createLayoutId("row");
    const column = layout.root.columns[0];
    if (!column) {
      throw new Error("missing column");
    }

    const withRow = {
      ...layout,
      root: {
        ...layout.root,
        columns: [
          {
            ...column,
            rows: [
              {
                type: "component" as const,
                id: rowId,
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
        ],
      },
    };

    const imported = {
      type: "component" as const,
      id: "new-id",
      component: createDefaultComponent("badge", "balance"),
    };

    const next = replaceComponentRowAt(
      withRow,
      { scope: "root", columnIndex: 0 },
      rowId,
      imported,
    );

    expect(next.root.columns[0]?.rows[0]).toMatchObject({
      id: rowId,
      component: { kind: "badge" },
    });
  });
});

describe("replaceNestedLayoutRowAt", () => {
  it("replaces a nested layout row while preserving row id", () => {
    const layout = createEmptyLayout(1);
    const nestedRowId = createLayoutId("nested");
    const column = layout.root.columns[0];
    if (!column) {
      throw new Error("missing column");
    }

    const withNested = {
      ...layout,
      root: {
        ...layout.root,
        columns: [
          {
            ...column,
            rows: [
              {
                type: "nested-layout" as const,
                id: nestedRowId,
                columnCount: 1,
                columns: [createEmptyColumn()],
              },
            ],
          },
        ],
      },
    };

    const imported = {
      type: "nested-layout" as const,
      id: "imported-nested",
      columnCount: 2,
      columns: [createEmptyColumn(), createEmptyColumn()],
    };

    const next = replaceNestedLayoutRowAt(withNested, nestedRowId, imported);
    expect(next.root.columns[0]?.rows[0]).toMatchObject({
      id: nestedRowId,
      columnCount: 2,
    });
  });
});

describe("updateComponentRowMetaAt display range", () => {
  it("clears displayFrom and displayTo when reset to all screens", () => {
    const layout = createEmptyLayout(1);
    const rowId = createLayoutId("row");
    const withRow = {
      ...layout,
      root: {
        ...layout.root,
        columns: [
          {
            ...layout.root.columns[0]!,
            rows: [
              {
                type: "component" as const,
                id: rowId,
                displayFrom: "md" as const,
                displayTo: "xl" as const,
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
        ],
      },
    };

    const next = updateComponentRowMetaAt(
      withRow,
      { scope: "root", columnIndex: 0 },
      rowId,
      { displayFrom: undefined, displayTo: undefined },
    );

    const row = next.root.columns[0]?.rows[0];
    expect(row).toMatchObject({ type: "component", id: rowId });
    expect(row).not.toHaveProperty("displayFrom");
    expect(row).not.toHaveProperty("displayTo");
  });
});

describe("createDefaultComponent", () => {
  it("creates entity-field-selector defaults", () => {
    expect(createDefaultComponent("entity-field-selector", "bankId")).toEqual({
      kind: "entity-field-selector",
      fieldPath: "bankId",
      layout: "list",
      enableSearch: true,
    });
  });

  it("creates icon defaults", () => {
    expect(createDefaultComponent("icon")).toEqual({
      kind: "icon",
      iconName: "CircleCheck",
    });
  });
});
