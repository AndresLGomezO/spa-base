import { describe, expect, it } from "vitest";

import { MOBILE_BREAKPOINT } from "./usePreferNativePickers.js";

describe("usePreferNativePickers", () => {
  it("defines mobile breakpoint aligned with sidebar", () => {
    expect(MOBILE_BREAKPOINT).toBe(768);
  });
});
