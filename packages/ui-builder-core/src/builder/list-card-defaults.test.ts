import { describe, expect, it } from "vitest";

import {
  createDefaultListCardLayout,
  isListCardNestedRootLayout,
} from "./list-card-defaults.js";

describe("createDefaultListCardLayout", () => {
  it("creates a root nested-layout row with two inner columns and default field components", () => {
    const layout = createDefaultListCardLayout(["name", "balance", "status"]);

    expect(isListCardNestedRootLayout(layout)).toBe(true);
    expect(layout.showActions).toBe(true);

    const rootColumn = layout.root.columns[0];
    expect(rootColumn?.rows).toHaveLength(1);

    const nestedRow = rootColumn?.rows[0];
    expect(nestedRow?.type).toBe("nested-layout");
    if (nestedRow?.type !== "nested-layout") {
      return;
    }

    expect(nestedRow.columnCount).toBe(2);
    expect(nestedRow.columns[0]?.rows.length).toBeGreaterThan(0);
    expect(nestedRow.columns[1]?.rows.length).toBeGreaterThan(0);
  });
});
