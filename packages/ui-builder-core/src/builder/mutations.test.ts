import { describe, expect, it } from "vitest";

import { createLayoutId } from "./id.js";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyColumn,
  createEmptyLayout,
  moveRootColumn,
  replaceComponentRowAt,
  replaceLayoutDocument,
  replaceNestedLayoutRowAt,
  setRootColumnCount,
  setRootColumnWidthPercent,
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
