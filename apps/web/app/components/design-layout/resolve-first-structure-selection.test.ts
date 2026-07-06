import { createDefaultFormLayout } from "@repo/entities";
import { describe, expect, it } from "vitest";

import { resolveFirstComponentRowRef } from "./resolve-first-structure-selection";

describe("resolveFirstComponentRowRef", () => {
  it("returns the first root row ref when present", () => {
    const layout = createDefaultFormLayout(["name"]);

    const firstRow = resolveFirstComponentRowRef(layout);

    expect(firstRow).not.toBeNull();
    expect(firstRow?.locator).toEqual({ scope: "root", columnIndex: 0 });
    expect(firstRow?.rowId.length).toBeGreaterThan(0);
  });
});
