import {
  addComponentRowAt,
  beginContainerRootLayout,
  createDefaultComponent,
  isContainerComponent,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { findRowByRef } from "./form-designer-components-layout";
import {
  buildStructureTree,
  type StructureTreeLabels,
} from "./form-designer-structure-tree";
import { toComponentRowRef } from "./form-designer-component-row-ref";

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

    const rootContainer = layout.root.columns[0]?.rows[0];
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
