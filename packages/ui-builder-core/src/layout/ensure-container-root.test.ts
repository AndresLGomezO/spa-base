import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import {
  addComponentRowAt,
  createEmptyLayout,
  insertGridRowAt,
  isContainerComponent,
  isGridComponent,
  setRootColumnCount,
} from "../index.js";
import {
  ensureContainerRoot,
  isRootContainerRow,
  resolveRootContainer,
  resolveRootContainerLocator,
} from "./ensure-container-root.js";

describe("ensureContainerRoot", () => {
  it("wraps flat root rows into a root container", () => {
    const layout = createEmptyLayout(1);
    const withRow = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      {
        kind: "text",
        primary: { type: "field", path: "name" },
      },
    );

    const normalized = ensureContainerRoot(withRow);
    const rootContainer = resolveRootContainer(normalized);

    expect(rootContainer).not.toBeNull();
    expect(rootContainer?.config.rows).toHaveLength(1);
    expect(rootContainer?.config.rows[0]?.type).toBe("component");
  });

  it("wraps grid rows into container root", () => {
    const layout = insertGridRowAt(
      createEmptyLayout(1),
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      { trackCount: 1 },
    ).layout;

    const normalized = ensureContainerRoot(layout);
    const rootContainer = resolveRootContainer(normalized);

    expect(rootContainer?.config.rows.length).toBeGreaterThan(0);
    expect(isRootContainerRow(normalized, rootContainer!.row.id)).toBe(true);
  });

  it("is idempotent for canonical container root", () => {
    const once = ensureContainerRoot(createEmptyLayout(1));
    const twice = ensureContainerRoot(once);

    expect(twice).toEqual(once);
  });

  it("exposes container locator for designer inserts", () => {
    const layout = ensureContainerRoot(createEmptyLayout(1));
    const locator = resolveRootContainerLocator(layout);

    expect(locator).toEqual({
      scope: "container",
      columnIndex: 0,
      containerRowId: resolveRootContainer(layout)?.row.id,
    });
  });

  it("preserves grid rows moved inside container", () => {
    let layout = createEmptyLayout(1);
    const { layout: withGrid } = insertGridRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      { trackCount: 2 },
    );
    layout = withGrid;

    const normalized = ensureContainerRoot(layout);
    const rootContainer = resolveRootContainer(normalized);
    const gridRow = rootContainer?.config.rows.find(
      (row) => row.type === "component" && isGridComponent(row.component),
    );

    expect(gridRow?.type).toBe("component");
    if (gridRow?.type === "component" && isGridComponent(gridRow.component)) {
      expect(gridRow.component.rows).toHaveLength(2);
    }
  });

  it("creates container component config with empty rows by default", () => {
    const layout = ensureContainerRoot(createEmptyLayout(1));
    const row = resolveLayoutRootColumns(layout)[0]?.rows[0];

    expect(row?.type).toBe("component");
    if (row?.type === "component" && isContainerComponent(row.component)) {
      expect(row.component.rows).toEqual([]);
    }
  });

  it("preserves multi-column root layouts for the form designer layout tab", () => {
    const singleColumn = ensureContainerRoot(createEmptyLayout(1));
    const multiColumn = setRootColumnCount(singleColumn, 3);
    const normalized = ensureContainerRoot(multiColumn);

    expect(asEditableLayoutRoot(normalized.root).columnCount).toBe(3);
    expect(resolveLayoutRootColumns(normalized)).toHaveLength(3);
  });
});
