import {
  addComponentRowAt,
  beginContainerRootLayout,
  createDefaultComponent,
  createEmptyLayout,
  insertGridRowAt,
  isContainerComponent,
  isGridComponent,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  createComponentsLayoutBinding,
  findRowByRef,
  isGridTrackColumnRef,
  resolveGridTrackRowLayoutStyles,
  updateGridTrackRowLayoutStyles,
} from "./form-designer-components-layout";
import {
  buildStructureTree,
  type StructureTreeLabels,
} from "./form-designer-structure-tree";
import { toComponentRowRef } from "./form-designer-component-row-ref";

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

describe("findRowByRef with container layouts", () => {
  it("resolves user components inside the root container", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const layout = addComponentRowAt(
      beganLayout,
      containerLocator,
      createDefaultComponent("user"),
    );

    const tree = buildStructureTree(layout, labels, []);
    const containerRow = tree[0]?.rows[0];
    if (
      !containerRow ||
      containerRow.type !== "component" ||
      containerRow.kind !== "container"
    ) {
      throw new Error("Expected root container row");
    }

    const userRow = containerRow.childRows?.[0];
    if (!userRow || userRow.type !== "component") {
      throw new Error("Expected user row in container");
    }

    const rowRef = toComponentRowRef(userRow.rowId, userRow.locator);
    const resolved = findRowByRef(layout, rowRef);

    expect(resolved?.type).toBe("component");
    if (resolved?.type === "component") {
      expect(resolved.component.kind).toBe("user");
    }
  });

  it("resolves user components inside a nested container", () => {
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
      (row) => row.type === "component" && isContainerComponent(row.component),
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
    const userRow =
      nestedContainerNode?.type === "component"
        ? nestedContainerNode.childRows?.[0]
        : undefined;

    if (!userRow || userRow.type !== "component") {
      throw new Error("Expected user row in nested container");
    }

    const rowRef = toComponentRowRef(userRow.rowId, userRow.locator);
    const resolved = findRowByRef(layout, rowRef);

    expect(resolved?.type).toBe("component");
    if (resolved?.type === "component") {
      expect(resolved.component.kind).toBe("user");
    }
  });
});

describe("grid track row layout styles", () => {
  it("reads and writes styles on the track container component", () => {
    const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
      createEmptyLayout(1),
      { scope: "root", columnIndex: 0 },
      { position: "after" },
      { trackCount: 2 },
    );

    const gridRow = resolveLayoutRootColumns(withGrid)[0]?.rows.find(
      (row) => row.id === gridRowId,
    );
    if (
      !gridRow ||
      gridRow.type !== "component" ||
      !isGridComponent(gridRow.component)
    ) {
      throw new Error("Expected grid row");
    }

    const trackRow = gridRow.component.rows[1];
    if (!trackRow || trackRow.type !== "component") {
      throw new Error("Expected second grid track");
    }

    const columnRef = {
      rootColumnIndex: 0,
      nestedParentRowId: gridRowId,
      nestedColumnIndex: 1,
    };

    expect(resolveGridTrackRowLayoutStyles(columnRef, gridRow)).toEqual(
      undefined,
    );

    let nextLayout = withGrid;
    const binding = createComponentsLayoutBinding(withGrid, (layout) => {
      nextLayout = layout;
    });

    const styles = [{ property: "padding", value: "1rem" }] as const;
    expect(
      updateGridTrackRowLayoutStyles(binding, columnRef, gridRow, styles),
    ).toBe(true);

    const updatedGridRow = resolveLayoutRootColumns(nextLayout)[0]?.rows.find(
      (row) => row.id === gridRowId,
    );
    if (
      !updatedGridRow ||
      updatedGridRow.type !== "component" ||
      !isGridComponent(updatedGridRow.component)
    ) {
      throw new Error("Expected updated grid row");
    }

    const updatedTrackRow = updatedGridRow.component.rows[1];
    if (
      !updatedTrackRow ||
      updatedTrackRow.type !== "component" ||
      !isContainerComponent(updatedTrackRow.component)
    ) {
      throw new Error("Expected updated grid track");
    }

    expect(updatedTrackRow.component.styles).toEqual([...styles]);
    expect(updatedTrackRow.styles).toBeUndefined();
    expect(updatedGridRow.styles).toBeUndefined();
    expect(resolveGridTrackRowLayoutStyles(columnRef, updatedGridRow)).toEqual([
      ...styles,
    ]);
    expect(isGridTrackColumnRef(columnRef, updatedGridRow)).toBe(true);
    expect(isGridTrackColumnRef({ rootColumnIndex: 0 }, updatedGridRow)).toBe(
      false,
    );
  });
});
