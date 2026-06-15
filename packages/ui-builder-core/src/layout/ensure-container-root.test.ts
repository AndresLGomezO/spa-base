import { describe, expect, it } from "vitest";

import {
  addComponentRowAt,
  createEmptyLayout,
  insertNestedLayoutRowAt,
  isContainerComponent,
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

  it("unwraps canonical nested-layout root into container rows", () => {
    let layout = createEmptyLayout(1);
    const { layout: withNested, rowId } = insertNestedLayoutRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      1,
    );
    layout = addComponentRowAt(
      withNested,
      {
        scope: "nested",
        columnIndex: 0,
        rowId,
        nestedColumnIndex: 0,
      },
      {
        kind: "text",
        primary: { type: "field", path: "name" },
      },
    );

    const normalized = ensureContainerRoot(layout);
    const rootContainer = resolveRootContainer(normalized);

    expect(rootContainer?.config.rows).toHaveLength(1);
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

  it("preserves nested-layout rows moved inside container", () => {
    let layout = createEmptyLayout(1);
    const { layout: withNested } = insertNestedLayoutRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      2,
    );
    layout = withNested;

    const normalized = ensureContainerRoot(layout);
    const rootContainer = resolveRootContainer(normalized);
    const nestedRow = rootContainer?.config.rows.find(
      (row) => row.type === "nested-layout",
    );

    expect(nestedRow?.type).toBe("nested-layout");
    if (nestedRow?.type === "nested-layout") {
      expect(nestedRow.columnCount).toBe(2);
    }
  });

  it("creates container component config with empty rows by default", () => {
    const layout = ensureContainerRoot(createEmptyLayout(1));
    const row = layout.root.columns[0]?.rows[0];

    expect(row?.type).toBe("component");
    if (row?.type === "component" && isContainerComponent(row.component)) {
      expect(row.component.rows).toEqual([]);
    }
  });

  it("preserves multi-column root layouts for the form designer layout tab", () => {
    const singleColumn = ensureContainerRoot(createEmptyLayout(1));
    const multiColumn = setRootColumnCount(singleColumn, 3);
    const normalized = ensureContainerRoot(multiColumn);

    expect(normalized.root.columnCount).toBe(3);
    expect(normalized.root.columns).toHaveLength(3);
  });
});
