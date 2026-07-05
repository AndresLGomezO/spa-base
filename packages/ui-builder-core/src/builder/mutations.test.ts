import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import { createLayoutId } from "./id.js";
import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
  insertComponentRowAt,
  insertGridRowAt,
  moveRootColumn,
  normalizeLayout,
  replaceComponentRowAt,
  replaceLayoutDocument,
  resolveGridTrackLocators,
  setRootColumnCount,
  setRootColumnWidthPercent,
  updateComponentRowMetaAt,
  updateGridRowMetaAt,
  updateRootColumnDisplayRange,
  updateRootColumnMetaAt,
} from "./mutations.js";
import { beginContainerRootLayout } from "../layout/ensure-container-root.js";
import { isContainerComponent } from "../types/component.js";

describe("addComponentRowAt", () => {
  it("adds a component to the third grid track inside a container", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
      beganLayout,
      containerLocator,
      { position: "after" },
      { trackCount: 3 },
    );
    const trackLocators = resolveGridTrackLocators(
      withGrid,
      containerLocator,
      gridRowId,
    );
    const thirdTrack = trackLocators[2];
    expect(thirdTrack).toBeDefined();
    if (!thirdTrack) {
      return;
    }

    const next = addComponentRowAt(
      withGrid,
      thirdTrack,
      createDefaultComponent("text", "name"),
    );

    const containerRow = resolveLayoutRootColumns(next)[0]?.rows[0];
    expect(containerRow?.type).toBe("component");
    if (
      containerRow?.type !== "component" ||
      containerRow.component.kind !== "grid"
    ) {
      return;
    }

    expect(containerRow.component.rows[2]?.type).toBe("component");
    const thirdTrackRow = containerRow.component.rows[2];
    if (
      thirdTrackRow?.type === "component" &&
      isContainerComponent(thirdTrackRow.component)
    ) {
      expect(thirdTrackRow.component.rows).toHaveLength(1);
    }
  });

  it("adds a component when the grid is inside another container", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const { layout: withOuterGrid, rowId: outerGridRowId } = insertGridRowAt(
      beganLayout,
      containerLocator,
      { position: "after" },
      { trackCount: 2 },
    );
    const [leftTrack] = resolveGridTrackLocators(
      withOuterGrid,
      containerLocator,
      outerGridRowId,
    );
    expect(leftTrack).toBeDefined();
    if (!leftTrack) {
      return;
    }

    const { layout: withInnerGrid, rowId: innerGridRowId } = insertGridRowAt(
      withOuterGrid,
      leftTrack,
      { position: "after" },
      { trackCount: 3 },
    );
    const innerTracks = resolveGridTrackLocators(
      withInnerGrid,
      leftTrack,
      innerGridRowId,
    );
    const thirdInnerTrack = innerTracks[2];
    expect(thirdInnerTrack).toBeDefined();
    if (!thirdInnerTrack) {
      return;
    }

    const next = addComponentRowAt(
      withInnerGrid,
      thirdInnerTrack,
      createDefaultComponent("text", "balance"),
    );

    const containerRow = resolveLayoutRootColumns(next)[0]?.rows[0];
    expect(containerRow?.type).toBe("component");
    if (
      containerRow?.type !== "component" ||
      containerRow.component.kind !== "grid"
    ) {
      return;
    }

    const leftTrackRow = containerRow.component.rows[0];
    expect(leftTrackRow?.type).toBe("component");
    if (
      leftTrackRow?.type !== "component" ||
      leftTrackRow.component.kind !== "grid"
    ) {
      return;
    }

    expect(leftTrackRow.component.rows[2]?.type).toBe("component");
    const thirdInnerTrackRow = leftTrackRow.component.rows[2];
    if (
      thirdInnerTrackRow?.type === "component" &&
      isContainerComponent(thirdInnerTrackRow.component)
    ) {
      expect(thirdInnerTrackRow.component.rows[0]).toMatchObject({
        type: "component",
        component: { kind: "text", primary: { path: "balance" } },
      });
    }
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

    const rows = resolveLayoutRootColumns(second.layout)[0]?.rows ?? [];
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

    const rows = resolveLayoutRootColumns(second.layout)[0]?.rows ?? [];
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

    const rows = resolveLayoutRootColumns(result.layout)[0]?.rows ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(result.rowId);
  });

  it("inserts into a grid track at the requested position", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
      beganLayout,
      containerLocator,
      { position: "after" },
      { trackCount: 2 },
    );
    const trackLocators = resolveGridTrackLocators(
      withGrid,
      containerLocator,
      gridRowId,
    );
    const rightTrack = trackLocators[1];
    expect(rightTrack).toBeDefined();
    if (!rightTrack) {
      return;
    }

    const first = insertComponentRowAt(
      withGrid,
      rightTrack,
      { position: "after" },
      createDefaultComponent("text", "name"),
    );

    const second = insertComponentRowAt(
      first.layout,
      rightTrack,
      { position: "before", referenceRowId: first.rowId },
      createDefaultComponent("badge", "status"),
    );

    const containerRow = resolveLayoutRootColumns(second.layout)[0]?.rows[0];
    expect(containerRow?.type).toBe("component");
    if (
      containerRow?.type !== "component" ||
      containerRow.component.kind !== "grid"
    ) {
      return;
    }

    const secondTrack = containerRow.component.rows[1];
    const rows =
      secondTrack?.type === "component" &&
      isContainerComponent(secondTrack.component)
        ? secondTrack.component.rows
        : [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(second.rowId);
    expect(rows[1]?.id).toBe(first.rowId);
  });
});

describe("insertGridRowAt", () => {
  it("inserts a grid row before a reference row", () => {
    let layout = createEmptyLayout(1);
    const component = insertComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      createDefaultComponent("text", "name"),
    );
    layout = component.layout;

    const grid = insertGridRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "before", referenceRowId: component.rowId },
      { trackCount: 2 },
    );

    const rows = resolveLayoutRootColumns(grid.layout)[0]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(grid.rowId);
    expect(rows[0]?.type).toBe("component");
    if (rows[0]?.type === "component") {
      expect(rows[0].component.kind).toBe("grid");
    }
    expect(rows[1]?.id).toBe(component.rowId);
  });
});

describe("setRootColumnWidthPercent", () => {
  it("sets explicit width on a column", () => {
    const layout = createEmptyLayout(2);
    const next = setRootColumnWidthPercent(layout, 0, 20);
    expect(resolveLayoutRootColumns(next)[0]?.widthPercent).toBe(20);
    expect(resolveLayoutRootColumns(next)[1]?.widthPercent).toBeUndefined();
  });

  it("clamps width when other columns are auto", () => {
    const layout = setRootColumnWidthPercent(createEmptyLayout(3), 0, 80);
    const next = setRootColumnWidthPercent(layout, 1, 50);
    expect(resolveLayoutRootColumns(next)[1]?.widthPercent).toBe(20);
  });

  it("clears explicit width when percent is undefined", () => {
    const layout = setRootColumnWidthPercent(createEmptyLayout(2), 0, 30);
    const next = setRootColumnWidthPercent(layout, 0, undefined);
    expect(resolveLayoutRootColumns(next)[0]?.widthPercent).toBeUndefined();
  });
});

describe("updateRootColumnDisplayRange", () => {
  it("sets displayFrom and displayTo on a root column", () => {
    const layout = createEmptyLayout(2);
    const next = updateRootColumnDisplayRange(layout, 1, {
      displayFrom: "md",
      displayTo: "xl",
    });
    expect(resolveLayoutRootColumns(next)[1]?.displayFrom).toBe("md");
    expect(resolveLayoutRootColumns(next)[1]?.displayTo).toBe("xl");
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
    expect(resolveLayoutRootColumns(layout)[0]?.displayFrom).toBeUndefined();
    expect(resolveLayoutRootColumns(layout)[0]?.displayTo).toBeUndefined();
  });
});

describe("moveRootColumn", () => {
  it("swaps widthPercent between columns", () => {
    let layout = createEmptyLayout(2);
    layout = setRootColumnWidthPercent(layout, 0, 25);
    layout = setRootColumnWidthPercent(layout, 1, 75);
    const next = moveRootColumn(layout, 0, 1);
    expect(resolveLayoutRootColumns(next)[0]?.widthPercent).toBe(75);
    expect(resolveLayoutRootColumns(next)[1]?.widthPercent).toBe(25);
  });
});

describe("setRootColumnCount", () => {
  it("clears width percents when column count decreases", () => {
    let layout = createEmptyLayout(3);
    layout = setRootColumnWidthPercent(layout, 0, 20);
    layout = setRootColumnWidthPercent(layout, 1, 30);
    const next = setRootColumnCount(layout, 2);
    expect(resolveLayoutRootColumns(next)[0]?.widthPercent).toBeUndefined();
    expect(resolveLayoutRootColumns(next)[1]?.widthPercent).toBeUndefined();
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
            ...resolveLayoutRootColumns(base)[0]!,
            rows: [
              {
                type: "component" as const,
                id: "imported-row",
                component: createDefaultComponent("text", "name"),
              },
            ],
          },
          ...resolveLayoutRootColumns(base).slice(1),
        ],
      },
    };

    const next = replaceLayoutDocument(imported);
    expect(asEditableLayoutRoot(next.root).columnCount).toBe(2);
    expect(resolveLayoutRootColumns(next)[0]?.rows[0]?.id).not.toBe(
      "imported-row",
    );
  });
});

describe("replaceComponentRowAt", () => {
  it("replaces a component row while preserving row id", () => {
    const layout = createEmptyLayout(1);
    const rowId = createLayoutId("row");
    const column = resolveLayoutRootColumns(layout)[0];
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

    expect(resolveLayoutRootColumns(next)[0]?.rows[0]).toMatchObject({
      id: rowId,
      component: { kind: "badge" },
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
            ...resolveLayoutRootColumns(layout)[0]!,
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

    const row = resolveLayoutRootColumns(next)[0]?.rows[0];
    expect(row).toMatchObject({ type: "component", id: rowId });
    expect(row).not.toHaveProperty("displayFrom");
    expect(row).not.toHaveProperty("displayTo");
  });
});

describe("structure item name mutations", () => {
  it("persists and clears component row names", () => {
    const layout = createEmptyLayout(1);
    const rowId = createLayoutId("row");
    const withRow = {
      ...layout,
      root: {
        ...layout.root,
        columns: [
          {
            ...resolveLayoutRootColumns(layout)[0]!,
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

    const named = updateComponentRowMetaAt(
      withRow,
      { scope: "root", columnIndex: 0 },
      rowId,
      { name: "  Header  " },
    );
    expect(resolveLayoutRootColumns(named)[0]?.rows[0]).toMatchObject({
      name: "Header",
    });

    const cleared = updateComponentRowMetaAt(
      named,
      { scope: "root", columnIndex: 0 },
      rowId,
      { name: undefined },
    );
    const row = resolveLayoutRootColumns(cleared)[0]?.rows[0];
    expect(row).toMatchObject({ type: "component", id: rowId });
    expect(row).not.toHaveProperty("name");
  });

  it("persists and clears root column names", () => {
    const layout = createEmptyLayout(1);

    const named = updateRootColumnMetaAt(layout, 0, { name: "Main" });
    expect(resolveLayoutRootColumns(named)[0]).toMatchObject({ name: "Main" });

    const cleared = updateRootColumnMetaAt(named, 0, { name: undefined });
    expect(resolveLayoutRootColumns(cleared)[0]).not.toHaveProperty("name");
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

describe("updateGridRowMetaAt", () => {
  it("stores gap on the grid component and strips legacy gap style rules", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
      beganLayout,
      containerLocator,
      { position: "after" },
      { trackCount: 2 },
    );

    const next = updateGridRowMetaAt(withGrid, containerLocator, gridRowId, {
      gap: "32",
    });

    const gridRow = resolveLayoutRootColumns(next)[0]?.rows[0];
    expect(gridRow?.type).toBe("component");
    if (gridRow?.type !== "component" || gridRow.component.kind !== "grid") {
      return;
    }

    expect(gridRow.component.gap).toBe("32");
    expect(gridRow.component.styles ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "gap" })]),
    );
    expect(gridRow.styles ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "gap" })]),
    );
  });
});

describe("normalizeLayout", () => {
  it("repairs root columnCount to match columns.length", () => {
    const layout = createEmptyLayout(1);
    const withMismatch = {
      ...layout,
      root: {
        ...layout.root,
        columnCount: 3,
        columns: [resolveLayoutRootColumns(layout)[0]!],
      },
    };

    const normalized = normalizeLayout(withMismatch);
    expect(asEditableLayoutRoot(normalized.root).columnCount).toBe(1);
    expect(resolveLayoutRootColumns(normalized)).toHaveLength(1);
  });
});
