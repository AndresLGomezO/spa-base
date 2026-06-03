import { describe, expect, it } from "vitest";

import {
  addStyleRule,
  coerceNumericStyleValue,
  numericStyleInputMin,
  removeStyleRule,
  upsertStyleRule,
} from "./style-rules-state.js";

describe("style-rules-state", () => {
  it("replaces duplicate property when property changes", () => {
    const styles = [
      { property: "color" as const, value: "muted" },
      { property: "fontSize" as const, value: "16" },
    ];

    const next = upsertStyleRule(styles, 1, { property: "color" });

    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ property: "color", value: "default" });
  });

  it("adds a rule with an unused property", () => {
    const next = addStyleRule([{ property: "color", value: "primary" }]);
    expect(next.length).toBe(2);
    expect(next[1]?.property).not.toBe("color");
  });

  it("coerces numeric style values with pixel minimums", () => {
    expect(numericStyleInputMin("gap")).toBe(0);
    expect(numericStyleInputMin("fontSize")).toBe(1);
    expect(numericStyleInputMin("borderWidth")).toBe(1);

    expect(coerceNumericStyleValue("gap", "12")).toBe("12");
    expect(coerceNumericStyleValue("gap", "-5")).toBe("0");
    expect(coerceNumericStyleValue("gap", "")).toBe("0");
    expect(coerceNumericStyleValue("fontSize", "0")).toBe("1");
    expect(coerceNumericStyleValue("fontSize", "abc")).toBe("1");
  });

  it("removes a rule by index", () => {
    const next = removeStyleRule(
      [
        { property: "color", value: "muted" },
        { property: "fontWeight", value: "bold" },
      ],
      0,
    );
    expect(next).toEqual([{ property: "fontWeight", value: "bold" }]);
  });
});
