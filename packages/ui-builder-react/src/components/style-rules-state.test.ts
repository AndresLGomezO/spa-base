import { describe, expect, it } from "vitest";

import {
  addStyleRule,
  coerceNumericStyleValue,
  formatStyleRuleValuePreview,
  numericStyleInputMin,
  removeStyleRule,
  upsertStyleRule,
} from "./style-rules-state.js";
import { NEGATIVE_MARGIN_MIN_PX } from "@repo/ui-builder-core";

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

  it("allows negative margin values", () => {
    expect(numericStyleInputMin("marginTop")).toBe(NEGATIVE_MARGIN_MIN_PX);
    expect(coerceNumericStyleValue("marginTop", "-40")).toBe("-40");
    expect(coerceNumericStyleValue("marginTop", "-1000")).toBe("-999");
    expect(coerceNumericStyleValue("paddingTop", "-5")).toBe("0");
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

  it("formats enum style values for preview labels", () => {
    expect(
      formatStyleRuleValuePreview({ property: "fontWeight", value: "bold" }),
    ).toBe("Bold");
    expect(
      formatStyleRuleValuePreview({ property: "fontWeight", value: "0" }),
    ).toBe("0");
  });
});
