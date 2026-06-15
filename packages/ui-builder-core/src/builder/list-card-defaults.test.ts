import { describe, expect, it } from "vitest";

import { isContainerComponent } from "../types/component.js";
import {
  createDefaultListCardLayout,
  isListCardContainerRootLayout,
} from "./list-card-defaults.js";

describe("createDefaultListCardLayout", () => {
  it("creates a root container with nested-layout and default field components", () => {
    const layout = createDefaultListCardLayout(["name", "balance", "status"]);

    expect(isListCardContainerRootLayout(layout)).toBe(true);
    expect(layout.showActions).toBe(true);

    const rootColumn = layout.root.columns[0];
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

    const nestedRow = containerRow.component.rows[0];
    expect(nestedRow?.type).toBe("nested-layout");
    if (nestedRow?.type !== "nested-layout") {
      return;
    }

    expect(nestedRow.columnCount).toBe(2);
    expect(nestedRow.columns[0]?.rows.length).toBeGreaterThan(0);
    expect(nestedRow.columns[1]?.rows.length).toBeGreaterThan(0);
  });
});
