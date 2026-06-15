import {
  addComponentRowAt,
  beginContainerRootLayout,
  createDefaultComponent,
  insertNestedLayoutRowAt,
  isContainerComponent,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { toComponentRowRef } from "./form-designer-component-row-ref";
import {
  getParentRowRef,
  isRowAncestorOf,
  resolvePreviewColumnFocusState,
  resolvePreviewRowFocusState,
} from "./preview-focus-state";
import {
  buildStructureTree,
  type StructureTreeLabels,
} from "./form-designer-structure-tree";

const labels: StructureTreeLabels = {
  column: (column) => `Column ${column}`,
  nestedLayout: (count) => `Nested layout (${count} cols)`,
  container: "Container",
  section: "Section",
  actions: "Actions",
  kindDefaults: {
    user: "Signed-in user",
  },
};

describe("preview-focus-state", () => {
  describe("getParentRowRef and isRowAncestorOf", () => {
    it("walks from container-scoped rows to the root container", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const containerNode = tree[0]?.rows[0];
      const userNode =
        containerNode?.type === "component"
          ? containerNode.childRows?.[0]
          : undefined;

      if (
        !containerNode ||
        containerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected container layout with user row");
      }

      const containerRef = toComponentRowRef(
        containerNode.rowId,
        containerNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(getParentRowRef(layout, userRef)).toEqual(containerRef);
      expect(getParentRowRef(layout, containerRef)).toBeNull();
      expect(isRowAncestorOf(layout, containerRef, userRef)).toBe(true);
      expect(isRowAncestorOf(layout, userRef, containerRef)).toBe(false);
    });

    it("walks through nested containers", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      let layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("container"),
      );

      const rootContainer = layout.root.columns[0]?.rows[0];
      if (
        !rootContainer ||
        rootContainer.type !== "component" ||
        !isContainerComponent(rootContainer.component)
      ) {
        throw new Error("Expected root container");
      }

      const nestedContainer = rootContainer.component.rows.find(
        (row) =>
          row.type === "component" && isContainerComponent(row.component),
      );
      if (!nestedContainer || nestedContainer.type !== "component") {
        throw new Error("Expected nested container");
      }

      layout = addComponentRowAt(
        layout,
        {
          scope: "container",
          columnIndex: containerLocator.columnIndex,
          containerRowId: nestedContainer.id,
        },
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const rootContainerNode = tree[0]?.rows[0];
      const nestedContainerNode =
        rootContainerNode?.type === "component"
          ? rootContainerNode.childRows?.find(
              (row) => row.type === "component" && row.kind === "container",
            )
          : undefined;
      const userNode =
        nestedContainerNode?.type === "component"
          ? nestedContainerNode.childRows?.[0]
          : undefined;

      if (
        !rootContainerNode ||
        rootContainerNode.type !== "component" ||
        !nestedContainerNode ||
        nestedContainerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected nested container layout with user row");
      }

      const rootContainerRef = toComponentRowRef(
        rootContainerNode.rowId,
        rootContainerNode.locator,
      );
      const nestedContainerRef = toComponentRowRef(
        nestedContainerNode.rowId,
        nestedContainerNode.locator,
      );
      const userRowRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(getParentRowRef(layout, userRowRef)).toEqual(nestedContainerRef);
      expect(getParentRowRef(layout, nestedContainerRef)).toEqual(
        rootContainerRef,
      );
      expect(isRowAncestorOf(layout, rootContainerRef, userRowRef)).toBe(true);
      expect(isRowAncestorOf(layout, nestedContainerRef, userRowRef)).toBe(
        true,
      );
    });
  });

  describe("resolvePreviewRowFocusState with container layouts", () => {
    it("focuses user row inside root container without dimming the container", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const containerNode = tree[0]?.rows[0];
      const userNode =
        containerNode?.type === "component"
          ? containerNode.childRows?.[0]
          : undefined;

      if (
        !containerNode ||
        containerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected container layout with user row");
      }

      const containerRef = toComponentRowRef(
        containerNode.rowId,
        containerNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(
        resolvePreviewRowFocusState(layout, containerRef, userRef, null),
      ).toBe("none");
    });

    it("focuses user row inside nested container without dimming ancestor containers", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      let layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("container"),
      );

      const rootContainer = layout.root.columns[0]?.rows[0];
      if (
        !rootContainer ||
        rootContainer.type !== "component" ||
        !isContainerComponent(rootContainer.component)
      ) {
        throw new Error("Expected root container");
      }

      const nestedContainer = rootContainer.component.rows.find(
        (row) =>
          row.type === "component" && isContainerComponent(row.component),
      );
      if (!nestedContainer || nestedContainer.type !== "component") {
        throw new Error("Expected nested container");
      }

      layout = addComponentRowAt(
        layout,
        {
          scope: "container",
          columnIndex: containerLocator.columnIndex,
          containerRowId: nestedContainer.id,
        },
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const rootContainerNode = tree[0]?.rows[0];
      const nestedContainerNode =
        rootContainerNode?.type === "component"
          ? rootContainerNode.childRows?.find(
              (row) => row.type === "component" && row.kind === "container",
            )
          : undefined;
      const userNode =
        nestedContainerNode?.type === "component"
          ? nestedContainerNode.childRows?.[0]
          : undefined;

      if (
        !rootContainerNode ||
        rootContainerNode.type !== "component" ||
        !nestedContainerNode ||
        nestedContainerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected nested container layout with user row");
      }

      const rootContainerRef = toComponentRowRef(
        rootContainerNode.rowId,
        rootContainerNode.locator,
      );
      const nestedContainerRef = toComponentRowRef(
        nestedContainerNode.rowId,
        nestedContainerNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(
        resolvePreviewRowFocusState(layout, rootContainerRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewRowFocusState(layout, nestedContainerRef, userRef, null),
      ).toBe("none");
    });

    it("dims sibling rows inside a container", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      let layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("user"),
      );
      layout = addComponentRowAt(
        layout,
        containerLocator,
        createDefaultComponent("text"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const containerNode = tree[0]?.rows[0];
      const userNode =
        containerNode?.type === "component"
          ? containerNode.childRows?.[0]
          : undefined;
      const textNode =
        containerNode?.type === "component"
          ? containerNode.childRows?.[1]
          : undefined;

      if (
        !userNode ||
        userNode.type !== "component" ||
        !textNode ||
        textNode.type !== "component"
      ) {
        throw new Error("Expected two sibling rows in container");
      }

      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);
      const textRef = toComponentRowRef(textNode.rowId, textNode.locator);

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(resolvePreviewRowFocusState(layout, textRef, userRef, null)).toBe(
        "dimmed",
      );
    });

    it("focuses nested-layout children inside a container without dimming the nested layout shell", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const rootContainerId =
        beganLayout.root.columns[0]?.rows[0]?.type === "component"
          ? beganLayout.root.columns[0].rows[0].id
          : null;

      if (!rootContainerId) {
        throw new Error("Expected root container id");
      }

      const { layout: withNested, rowId: nestedRowId } =
        insertNestedLayoutRowAt(
          beganLayout,
          containerLocator,
          { position: "after" },
          2,
        );

      const layout = addComponentRowAt(
        withNested,
        {
          scope: "nested",
          columnIndex: containerLocator.columnIndex,
          rowId: nestedRowId,
          nestedColumnIndex: 0,
          containerRowId: rootContainerId,
        },
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const containerNode = tree[0]?.rows[0];
      const nestedLayoutNode =
        containerNode?.type === "component"
          ? containerNode.childRows?.find((row) => row.type === "nested-layout")
          : undefined;
      const userNode =
        nestedLayoutNode?.type === "nested-layout"
          ? nestedLayoutNode.columns[0]?.rows[0]
          : undefined;

      if (
        !nestedLayoutNode ||
        nestedLayoutNode.type !== "nested-layout" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error(
          "Expected nested layout with user row inside container",
        );
      }

      const nestedLayoutRef = toComponentRowRef(
        nestedLayoutNode.rowId,
        nestedLayoutNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(
        resolvePreviewRowFocusState(layout, nestedLayoutRef, userRef, null),
      ).toBe("none");
    });
  });

  describe("resolvePreviewColumnFocusState", () => {
    it("dims peer root columns when another column is focused", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("user"),
      );

      const focusedColumn = { rootColumnIndex: 0 };
      const peerColumn = { rootColumnIndex: 1 };

      expect(
        resolvePreviewColumnFocusState(
          layout,
          focusedColumn,
          null,
          focusedColumn,
        ),
      ).toBe("focused");
      expect(
        resolvePreviewColumnFocusState(layout, peerColumn, null, focusedColumn),
      ).toBe("dimmed");
    });

    it("does not dim nested columns that contain the focused row", () => {
      let layout = beginContainerRootLayout().layout;
      const { layout: withNested, rowId: nestedRowId } =
        insertNestedLayoutRowAt(
          layout,
          { scope: "root", columnIndex: 0 },
          { position: "after" },
          2,
        );

      layout = addComponentRowAt(
        withNested,
        {
          scope: "nested",
          columnIndex: 0,
          rowId: nestedRowId,
          nestedColumnIndex: 1,
        },
        createDefaultComponent("user"),
      );

      const nestedRow = layout.root.columns[0]?.rows.find(
        (row) => row.id === nestedRowId,
      );
      const userRow =
        nestedRow?.type === "nested-layout"
          ? nestedRow.columns[1]?.rows[0]
          : undefined;

      if (!userRow || userRow.type !== "component") {
        throw new Error("Expected user row in nested column");
      }

      const userRef = toComponentRowRef(userRow.id, {
        scope: "nested",
        columnIndex: 0,
        rowId: nestedRowId,
        nestedColumnIndex: 1,
      });

      const nestedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 1,
      };
      const peerNestedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 0,
      };

      expect(
        resolvePreviewColumnFocusState(layout, nestedColumnRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewColumnFocusState(
          layout,
          peerNestedColumnRef,
          userRef,
          null,
        ),
      ).toBe("none");
    });

    it("dims peer nested columns when another nested column is focused", () => {
      let layout = beginContainerRootLayout().layout;
      const { layout: withNested, rowId: nestedRowId } =
        insertNestedLayoutRowAt(
          layout,
          { scope: "root", columnIndex: 0 },
          { position: "after" },
          2,
        );

      layout = addComponentRowAt(
        withNested,
        {
          scope: "nested",
          columnIndex: 0,
          rowId: nestedRowId,
          nestedColumnIndex: 1,
        },
        createDefaultComponent("user"),
      );

      const focusedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 1,
      };
      const peerNestedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 0,
      };

      expect(
        resolvePreviewColumnFocusState(
          layout,
          focusedColumnRef,
          null,
          focusedColumnRef,
        ),
      ).toBe("focused");
      expect(
        resolvePreviewColumnFocusState(
          layout,
          peerNestedColumnRef,
          null,
          focusedColumnRef,
        ),
      ).toBe("dimmed");
    });
  });

  describe("deep nesting: container > container > nested layout > column > container", () => {
    function buildDeepNestedLayout() {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      let layout = addComponentRowAt(
        beganLayout,
        containerLocator,
        createDefaultComponent("container"),
      );

      const rootContainer = layout.root.columns[0]?.rows[0];
      if (
        !rootContainer ||
        rootContainer.type !== "component" ||
        !isContainerComponent(rootContainer.component)
      ) {
        throw new Error("Expected root container");
      }

      const childContainer = rootContainer.component.rows.find(
        (row) =>
          row.type === "component" && isContainerComponent(row.component),
      );
      if (!childContainer || childContainer.type !== "component") {
        throw new Error("Expected child container");
      }

      const { layout: withNested, rowId: nestedRowId } =
        insertNestedLayoutRowAt(
          layout,
          {
            scope: "container",
            columnIndex: containerLocator.columnIndex,
            containerRowId: childContainer.id,
          },
          { position: "after" },
          2,
        );

      layout = withNested;

      const updatedRootContainer = layout.root.columns[0]?.rows[0];
      const updatedChildContainer =
        updatedRootContainer?.type === "component" &&
        isContainerComponent(updatedRootContainer.component)
          ? updatedRootContainer.component.rows.find(
              (row) =>
                row.type === "component" &&
                isContainerComponent(row.component) &&
                row.id === childContainer.id,
            )
          : undefined;

      const nestedLayoutRow =
        updatedChildContainer?.type === "component" &&
        isContainerComponent(updatedChildContainer.component)
          ? updatedChildContainer.component.rows.find(
              (row) => row.type === "nested-layout" && row.id === nestedRowId,
            )
          : undefined;

      if (!nestedLayoutRow || nestedLayoutRow.type !== "nested-layout") {
        throw new Error("Expected nested layout inside child container");
      }

      layout = addComponentRowAt(
        layout,
        {
          scope: "nested",
          columnIndex: containerLocator.columnIndex,
          rowId: nestedRowId,
          nestedColumnIndex: 0,
          containerRowId: childContainer.id,
        },
        createDefaultComponent("container"),
      );

      const layoutAfterInnerContainer = layout.root.columns[0]?.rows[0];
      const childContainerAfterInsert =
        layoutAfterInnerContainer?.type === "component" &&
        isContainerComponent(layoutAfterInnerContainer.component)
          ? layoutAfterInnerContainer.component.rows.find(
              (row) =>
                row.type === "component" &&
                isContainerComponent(row.component) &&
                row.id === childContainer.id,
            )
          : undefined;
      const nestedLayoutAfterInsert =
        childContainerAfterInsert?.type === "component" &&
        isContainerComponent(childContainerAfterInsert.component)
          ? childContainerAfterInsert.component.rows.find(
              (row) => row.type === "nested-layout" && row.id === nestedRowId,
            )
          : undefined;

      const innerContainer =
        nestedLayoutAfterInsert?.type === "nested-layout"
          ? nestedLayoutAfterInsert.columns[0]?.rows.find(
              (row) =>
                row.type === "component" && isContainerComponent(row.component),
            )
          : undefined;
      if (!innerContainer || innerContainer.type !== "component") {
        throw new Error("Expected inner container in nested column 1");
      }

      layout = addComponentRowAt(
        layout,
        {
          scope: "container",
          columnIndex: containerLocator.columnIndex,
          containerRowId: innerContainer.id,
        },
        createDefaultComponent("user"),
      );

      return { layout, nestedRowId, childContainerId: childContainer.id };
    }

    it("does not dim rows inside a focused nested column when they use container scope", () => {
      const { layout, nestedRowId } = buildDeepNestedLayout();
      const tree = buildStructureTree(layout, labels, []);

      const rootContainerNode = tree[0]?.rows[0];
      const childContainerNode =
        rootContainerNode?.type === "component"
          ? rootContainerNode.childRows?.[0]
          : undefined;
      const nestedLayoutNode =
        childContainerNode?.type === "component"
          ? childContainerNode.childRows?.find(
              (row) => row.type === "nested-layout",
            )
          : undefined;
      const nestedColumnNode =
        nestedLayoutNode?.type === "nested-layout"
          ? nestedLayoutNode.columns[0]
          : undefined;
      const innerContainerNode = nestedColumnNode?.rows.find(
        (row) => row.type === "component" && row.kind === "container",
      );
      const userNode =
        innerContainerNode?.type === "component"
          ? innerContainerNode.childRows?.[0]
          : undefined;

      if (
        !nestedLayoutNode ||
        nestedLayoutNode.type !== "nested-layout" ||
        !innerContainerNode ||
        innerContainerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected deep nested structure nodes");
      }

      const focusedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 0,
      };
      const innerContainerRef = toComponentRowRef(
        innerContainerNode.rowId,
        innerContainerNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(userRef.locator.scope).toBe("container");
      expect(
        resolvePreviewRowFocusState(
          layout,
          innerContainerRef,
          null,
          focusedColumnRef,
        ),
      ).toBe("none");
      expect(
        resolvePreviewRowFocusState(layout, userRef, null, focusedColumnRef),
      ).toBe("none");
      expect(
        resolvePreviewColumnFocusState(layout, focusedColumnRef, userRef, null),
      ).toBe("none");
    });

    it("focuses container-scoped rows inside nested columns without ancestor dim overlays", () => {
      const { layout, nestedRowId } = buildDeepNestedLayout();
      const tree = buildStructureTree(layout, labels, []);

      const rootContainerNode = tree[0]?.rows[0];
      const childContainerNode =
        rootContainerNode?.type === "component"
          ? rootContainerNode.childRows?.[0]
          : undefined;
      const nestedLayoutNode =
        childContainerNode?.type === "component"
          ? childContainerNode.childRows?.find(
              (row) => row.type === "nested-layout",
            )
          : undefined;
      const nestedColumnNode =
        nestedLayoutNode?.type === "nested-layout"
          ? nestedLayoutNode.columns[0]
          : undefined;
      const innerContainerNode = nestedColumnNode?.rows.find(
        (row) => row.type === "component" && row.kind === "container",
      );
      const userNode =
        innerContainerNode?.type === "component"
          ? innerContainerNode.childRows?.[0]
          : undefined;

      if (
        !rootContainerNode ||
        rootContainerNode.type !== "component" ||
        !childContainerNode ||
        childContainerNode.type !== "component" ||
        !nestedLayoutNode ||
        nestedLayoutNode.type !== "nested-layout" ||
        !innerContainerNode ||
        innerContainerNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected deep nested structure nodes");
      }

      const rootContainerRef = toComponentRowRef(
        rootContainerNode.rowId,
        rootContainerNode.locator,
      );
      const childContainerRef = toComponentRowRef(
        childContainerNode.rowId,
        childContainerNode.locator,
      );
      const nestedLayoutRef = toComponentRowRef(
        nestedLayoutNode.rowId,
        nestedLayoutNode.locator,
      );
      const innerContainerRef = toComponentRowRef(
        innerContainerNode.rowId,
        innerContainerNode.locator,
      );
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);
      const nestedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 0,
      };

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(
        resolvePreviewRowFocusState(layout, rootContainerRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewRowFocusState(layout, childContainerRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewRowFocusState(layout, nestedLayoutRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewRowFocusState(layout, innerContainerRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewColumnFocusState(layout, nestedColumnRef, userRef, null),
      ).toBe("none");
    });

    it("focuses direct nested-column rows even when the column is selected", () => {
      const { layout, nestedRowId } = buildDeepNestedLayout();
      const tree = buildStructureTree(layout, labels, []);
      const rootContainerNode = tree[0]?.rows[0];
      const childContainerNode =
        rootContainerNode?.type === "component"
          ? rootContainerNode.childRows?.[0]
          : undefined;
      const nestedLayoutNode =
        childContainerNode?.type === "component"
          ? childContainerNode.childRows?.find(
              (row) => row.type === "nested-layout",
            )
          : undefined;
      const directContainerNode =
        nestedLayoutNode?.type === "nested-layout"
          ? nestedLayoutNode.columns[0]?.rows.find(
              (row) => row.type === "component" && row.kind === "container",
            )
          : undefined;

      if (!directContainerNode || directContainerNode.type !== "component") {
        throw new Error("Expected direct container row in column 1");
      }

      const focusedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: nestedRowId,
        nestedColumnIndex: 0,
      };
      const directContainerRef = toComponentRowRef(
        directContainerNode.rowId,
        directContainerNode.locator,
      );

      expect(directContainerRef.locator.scope).toBe("nested");
      expect(
        resolvePreviewRowFocusState(
          layout,
          directContainerRef,
          directContainerRef,
          focusedColumnRef,
        ),
      ).toBe("focused");
      expect(
        resolvePreviewColumnFocusState(
          layout,
          focusedColumnRef,
          directContainerRef,
          focusedColumnRef,
        ),
      ).toBe("none");
    });
  });
});
