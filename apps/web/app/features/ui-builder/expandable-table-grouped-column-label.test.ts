import { describe, expect, it } from "vitest";
import { createDefaultTableCellLayout } from "@repo/ui-builder-core";

import { resolveFirstFieldPathFromCellLayout } from "./expandable-table-grouped-column-label";

describe("resolveFirstFieldPathFromCellLayout", () => {
  it("resolves the field path from container-wrapped default cell layouts", () => {
    const layout = createDefaultTableCellLayout(["date"]);

    expect(resolveFirstFieldPathFromCellLayout(layout)).toBe("date");
  });

  it("returns the first field when a cell has multiple fields", () => {
    const layout = createDefaultTableCellLayout(["amount", "currency"]);

    expect(resolveFirstFieldPathFromCellLayout(layout)).toBe("amount");
  });

  it("returns null when the layout has no field bindings", () => {
    const layout = createDefaultTableCellLayout([]);

    expect(resolveFirstFieldPathFromCellLayout(layout)).toBeNull();
  });
});
