import { describe, expect, it } from "vitest";

import { STYLE_PROPERTY_OPTIONS } from "./style-types.js";

describe("STYLE_PROPERTY_OPTIONS", () => {
  it("lists each style property once", () => {
    const unique = new Set(STYLE_PROPERTY_OPTIONS);
    expect(unique.size).toBe(STYLE_PROPERTY_OPTIONS.length);
  });
});
