import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import {
  addComponentRowAt,
  beginContainerRootLayout,
  createDefaultComponent,
  isContainerComponent,
  resolveContainerChildRows,
} from "../index.js";

describe("resolveContainerChildRows", () => {
  it("finds child rows for a root container", () => {
    const { layout: beganLayout, containerLocator } =
      beginContainerRootLayout();
    const layout = addComponentRowAt(
      beganLayout,
      containerLocator,
      createDefaultComponent("user"),
    );

    const rootRows = resolveLayoutRootColumns(layout)[0]?.rows ?? [];
    const childRows = resolveContainerChildRows(
      rootRows,
      containerLocator.containerRowId,
    );

    expect(childRows).toHaveLength(1);
    expect(childRows?.[0]?.type).toBe("component");
    if (childRows?.[0]?.type === "component") {
      expect(childRows[0].component.kind).toBe("user");
    }
  });

  it("finds child rows for a nested container", () => {
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

    const rootRows = resolveLayoutRootColumns(layout)[0]?.rows ?? [];
    const childRows = resolveContainerChildRows(rootRows, nestedContainer.id);

    expect(childRows).toHaveLength(1);
    expect(childRows?.[0]?.type).toBe("component");
    if (childRows?.[0]?.type === "component") {
      expect(childRows[0].component.kind).toBe("user");
    }
  });
});
