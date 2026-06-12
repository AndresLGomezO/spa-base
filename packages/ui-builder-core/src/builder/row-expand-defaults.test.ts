import { describe, expect, it } from "vitest";

import {
  createDefaultRowExpandLayout,
  isRowExpandNestedRootLayout,
} from "./row-expand-defaults.js";

describe("createDefaultRowExpandLayout", () => {
  it("creates a root nested-layout row with default field components", () => {
    const layout = createDefaultRowExpandLayout(["name", "balance", "status"]);

    expect(isRowExpandNestedRootLayout(layout)).toBe(true);

    const rootColumn = layout.root.columns[0];
    expect(rootColumn?.rows).toHaveLength(1);

    const nestedRow = rootColumn?.rows[0];
    expect(nestedRow?.type).toBe("nested-layout");
    if (nestedRow?.type !== "nested-layout") {
      return;
    }

    expect(nestedRow.columnCount).toBe(1);
    expect(nestedRow.columns[0]?.rows.length).toBeGreaterThan(0);
  });
});
