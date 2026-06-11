import {
  addComponentRowAt,
  addNestedLayoutRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  buildStructureTree,
  collectDefaultExpandedNodeIds,
  createColumnTopInsertAnchor,
  createRowBottomInsertAnchor,
  getRowMoveState,
  resolveComponentRowLabel,
  type StructureTreeLabels,
} from "./form-designer-structure-tree";

const labels: StructureTreeLabels = {
  column: (column) => `Column ${column}`,
  nestedLayout: (count) => `Nested layout (${count} cols)`,
  section: "Section",
  actions: "Actions",
  kindDefaults: {
    text: "Text",
    image: "Image",
  },
};

const fieldDescriptors = [
  { path: "name", label: "Name", valueType: "string" as const },
  { path: "email", label: "Email", valueType: "string" as const },
];

describe("form-designer-structure-tree", () => {
  it("builds a tree from root columns and component rows", () => {
    let layout = createEmptyLayout(2);
    layout = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      createDefaultComponent("form-field", "name"),
    );
    layout = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 1 },
      createDefaultComponent("form-section", "name"),
    );

    const tree = buildStructureTree(layout, labels, fieldDescriptors);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.rows[0]).toMatchObject({
      type: "component",
      kind: "form-field",
      label: "Name",
    });
    expect(tree[1]?.rows[0]).toMatchObject({
      type: "component",
      kind: "form-section",
      label: "Section",
    });
  });

  it("builds nested layout columns recursively", () => {
    let layout = createEmptyLayout(1);
    layout = addNestedLayoutRowAt(layout, { scope: "root", columnIndex: 0 }, 2);
    const nestedRow = layout.root.columns[0]?.rows[0];
    if (!nestedRow || nestedRow.type !== "nested-layout") {
      throw new Error("Expected nested layout row");
    }

    layout = addComponentRowAt(
      layout,
      {
        scope: "nested",
        columnIndex: 0,
        rowId: nestedRow.id,
        nestedColumnIndex: 0,
      },
      createDefaultComponent("text", "email"),
    );

    const tree = buildStructureTree(layout, labels, fieldDescriptors);
    const nested = tree[0]?.rows[0];

    expect(nested).toMatchObject({
      type: "nested-layout",
      label: "Nested layout (2 cols)",
    });
    expect(
      nested?.type === "nested-layout" && nested.columns[0]?.rows[0],
    ).toMatchObject({
      type: "component",
      kind: "text",
      label: "Email",
    });
  });

  it("resolves custom section titles and form-field labels", () => {
    expect(
      resolveComponentRowLabel(
        { kind: "form-section", title: "Contact details" },
        fieldDescriptors,
        labels,
      ),
    ).toBe("Contact details");

    expect(
      resolveComponentRowLabel(
        { kind: "form-field", fieldPath: "email" },
        fieldDescriptors,
        labels,
      ),
    ).toBe("Email");
  });

  it("creates insert anchors for column and row positions", () => {
    let layout = createEmptyLayout(1);
    layout = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      createDefaultComponent("form-field", "name"),
    );

    const tree = buildStructureTree(layout, labels, fieldDescriptors);
    const column = tree[0];
    if (!column) {
      throw new Error("Expected column");
    }

    expect(createColumnTopInsertAnchor(column)).toEqual({
      locator: { scope: "root", columnIndex: 0 },
      position: "before",
      referenceRowId: column.rows[0]?.rowId,
    });

    const row = column.rows[0];
    if (!row) {
      throw new Error("Expected row");
    }

    expect(createRowBottomInsertAnchor(row)).toEqual({
      locator: { scope: "root", columnIndex: 0 },
      position: "after",
      referenceRowId: row.rowId,
    });
  });

  it("reports row move state from sibling order", () => {
    let layout = createEmptyLayout(1);
    layout = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      createDefaultComponent("form-field", "name"),
    );
    layout = addComponentRowAt(
      layout,
      { scope: "root", columnIndex: 0 },
      createDefaultComponent("form-section", "name"),
    );

    const tree = buildStructureTree(layout, labels, fieldDescriptors);
    const firstRow = tree[0]?.rows[0];
    const secondRow = tree[0]?.rows[1];
    if (!firstRow || !secondRow) {
      throw new Error("Expected two rows");
    }

    expect(getRowMoveState(layout, firstRow)).toEqual({
      canMoveUp: false,
      canMoveDown: true,
    });
    expect(getRowMoveState(layout, secondRow)).toEqual({
      canMoveUp: true,
      canMoveDown: false,
    });
  });

  it("collects default expanded ids for columns and nested layouts", () => {
    let layout = createEmptyLayout(1);
    layout = addNestedLayoutRowAt(layout, { scope: "root", columnIndex: 0 }, 1);

    const tree = buildStructureTree(layout, labels, fieldDescriptors);
    const expanded = collectDefaultExpandedNodeIds(tree);

    expect(expanded).toContain("col-root-0");
    expect(expanded.some((id) => id.startsWith("row-"))).toBe(true);
    expect(
      expanded.some((id) => id.startsWith("col-") && id !== "col-root-0"),
    ).toBe(true);
  });
});
