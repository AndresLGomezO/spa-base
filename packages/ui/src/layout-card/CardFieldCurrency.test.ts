import { describe, expect, it } from "vitest";

import { resolveCurrencyTone } from "./CardFieldCurrency.js";

describe("resolveCurrencyTone", () => {
  it("returns positive for values greater than zero", () => {
    expect(resolveCurrencyTone(100)).toBe("positive");
    expect(resolveCurrencyTone("42.5")).toBe("positive");
  });

  it("returns negative for values less than zero", () => {
    expect(resolveCurrencyTone(-50)).toBe("negative");
    expect(resolveCurrencyTone("-12.75")).toBe("negative");
  });

  it("returns neutral for zero and non-numeric values", () => {
    expect(resolveCurrencyTone(0)).toBe("neutral");
    expect(resolveCurrencyTone("")).toBe("neutral");
    expect(resolveCurrencyTone(null)).toBe("neutral");
    expect(resolveCurrencyTone("not-a-number")).toBe("neutral");
  });
});
