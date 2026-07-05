import {
  addComponentRowAt,
  beginContainerRootLayout,
  createDefaultComponent,
  insertGridRowAt,
  isContainerComponent,
  isGridComponent,
  resolveLayoutRootColumns,
  resolveRootContainer,
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
  track: (track) => `Track ${track}`,
  grid: (count) => `Grid (${count} tracks)`,
  container: "Container",
  section: "Section",
  actions: "Actions",
  hiddenField: (label) => `${label} (Hidden)`,
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

      const rootContainer = resolveLayoutRootColumns(layout)[0]?.rows[0];
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

    it("keeps descendant rows clear when a container is focused", () => {
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

      expect(
        resolvePreviewRowFocusState(layout, containerRef, containerRef, null),
      ).toBe("focused");
      expect(
        resolvePreviewRowFocusState(layout, userRef, containerRef, null),
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

      const rootContainer = resolveLayoutRootColumns(layout)[0]?.rows[0];
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

    it("focuses grid track children inside a container without dimming the grid shell", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
        beganLayout,
        containerLocator,
        { position: "after" },
        { trackCount: 2 },
      );

      const gridRow = resolveRootContainer(withGrid)?.config.rows.find(
        (row) => row.id === gridRowId,
      );
      const trackRow =
        gridRow?.type === "component" && isGridComponent(gridRow.component)
          ? gridRow.component.rows[0]
          : undefined;

      if (!trackRow || trackRow.type !== "component") {
        throw new Error("Expected grid track row");
      }

      const layout = addComponentRowAt(
        withGrid,
        {
          scope: "container",
          columnIndex: containerLocator.columnIndex,
          containerRowId: trackRow.id,
        },
        createDefaultComponent("user"),
      );

      const tree = buildStructureTree(layout, labels, []);
      const gridNode =
        tree[0]?.rows[0]?.type === "component"
          ? tree[0].rows[0].childRows?.find(
              (row) => row.type === "component" && row.kind === "grid",
            )
          : undefined;
      const userNode =
        gridNode?.type === "component" && gridNode.kind === "grid"
          ? gridNode.tracks?.[0]?.rows[0]
          : undefined;

      if (
        !gridNode ||
        gridNode.type !== "component" ||
        !userNode ||
        userNode.type !== "component"
      ) {
        throw new Error("Expected grid with user row in first track");
      }

      const gridRef = toComponentRowRef(gridNode.rowId, gridNode.locator);
      const userRef = toComponentRowRef(userNode.rowId, userNode.locator);

      expect(resolvePreviewRowFocusState(layout, userRef, userRef, null)).toBe(
        "focused",
      );
      expect(resolvePreviewRowFocusState(layout, gridRef, userRef, null)).toBe(
        "none",
      );
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

    it("does not dim grid tracks that contain the focused row", () => {
      const { layout: beganLayout, containerLocator } =
        beginContainerRootLayout();
      const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
        beganLayout,
        containerLocator,
        { position: "after" },
        { trackCount: 2 },
      );

      const gridRow = resolveRootContainer(withGrid)?.config.rows.find(
        (row) => row.id === gridRowId,
      );
      const trackRow =
        gridRow?.type === "component" && isGridComponent(gridRow.component)
          ? gridRow.component.rows[1]
          : undefined;

      if (!trackRow || trackRow.type !== "component") {
        throw new Error("Expected second grid track");
      }

      const layout = addComponentRowAt(
        withGrid,
        {
          scope: "container",
          columnIndex: containerLocator.columnIndex,
          containerRowId: trackRow.id,
        },
        createDefaultComponent("user"),
      );

      const updatedGridRow = resolveRootContainer(layout)?.config.rows.find(
        (row) => row.id === gridRowId,
      );
      const updatedTrackRow =
        updatedGridRow?.type === "component" &&
        isGridComponent(updatedGridRow.component)
          ? updatedGridRow.component.rows[1]
          : undefined;

      const userInTrack =
        updatedTrackRow?.type === "component" &&
        isContainerComponent(updatedTrackRow.component)
          ? updatedTrackRow.component.rows[0]
          : undefined;

      if (!userInTrack || userInTrack.type !== "component") {
        throw new Error("Expected user row in grid track");
      }

      const userRef = toComponentRowRef(userInTrack.id, {
        scope: "container",
        columnIndex: containerLocator.columnIndex,
        containerRowId: updatedTrackRow!.id,
      });

      const trackColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: gridRowId,
        nestedColumnIndex: 1,
      };
      const peerTrackColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: gridRowId,
        nestedColumnIndex: 0,
      };

      expect(
        resolvePreviewColumnFocusState(layout, trackColumnRef, userRef, null),
      ).toBe("none");
      expect(
        resolvePreviewColumnFocusState(
          layout,
          peerTrackColumnRef,
          userRef,
          null,
        ),
      ).toBe("none");
    });

    it("dims peer grid tracks when another grid track column is focused", () => {
      let layout = beginContainerRootLayout().layout;
      const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
        layout,
        { scope: "root", columnIndex: 0 },
        { position: "after" },
        { trackCount: 2 },
      );
      layout = withGrid;

      const focusedColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: gridRowId,
        nestedColumnIndex: 1,
      };
      const peerColumnRef = {
        rootColumnIndex: 0,
        nestedParentRowId: gridRowId,
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
          peerColumnRef,
          null,
          focusedColumnRef,
        ),
      ).toBe("dimmed");
    });
  });
});
