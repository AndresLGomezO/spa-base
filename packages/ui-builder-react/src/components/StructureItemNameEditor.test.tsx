import { describe, expect, it } from "vitest";

import { normalizeStructureItemName } from "./StructureItemNameEditor.js";

describe("normalizeStructureItemName", () => {
  it("returns undefined for empty or whitespace values", () => {
    expect(normalizeStructureItemName("")).toBeUndefined();
    expect(normalizeStructureItemName("   ")).toBeUndefined();
  });

  it("trims non-empty values", () => {
    expect(normalizeStructureItemName("  Hero  ")).toBe("Hero");
  });
});
