import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import { isContainerComponent, isGridComponent } from "../types/component.js";
import {
  createDefaultListCardLayout,
  isListCardContainerRootLayout,
} from "./list-card-defaults.js";

describe("createDefaultListCardLayout", () => {
  it("creates a root container with grid and default field components", () => {
    const layout = createDefaultListCardLayout(["name", "balance", "status"]);

    expect(isListCardContainerRootLayout(layout)).toBe(true);
    expect(layout.showActions).toBe(true);

    const rootColumn = resolveLayoutRootColumns(layout)[0];
    expect(rootColumn?.rows).toHaveLength(1);

    const containerRow = rootColumn?.rows[0];
    expect(containerRow?.type).toBe("component");
    if (
      containerRow?.type !== "component" ||
      !isContainerComponent(containerRow.component)
    ) {
      return;
    }

    expect(containerRow.component.rows).toHaveLength(1);

    const gridRow = containerRow.component.rows[0];
    expect(gridRow?.type).toBe("component");
    if (gridRow?.type !== "component" || !isGridComponent(gridRow.component)) {
      return;
    }

    expect(gridRow.component.rows).toHaveLength(2);
    if (gridRow.component.rows[0]?.type === "component") {
      const track = gridRow.component.rows[0];
      if (isContainerComponent(track.component)) {
        expect(track.component.rows.length).toBeGreaterThan(0);
      }
    }
    if (gridRow.component.rows[1]?.type === "component") {
      const track = gridRow.component.rows[1];
      if (isContainerComponent(track.component)) {
        expect(track.component.rows.length).toBeGreaterThan(0);
      }
    }
  });
});
