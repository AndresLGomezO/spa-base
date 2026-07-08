import { describe, expect, it } from "vitest";

import {
  addStyleRule,
  coerceNumericStyleValue,
  formatBoxLengthCustomValue,
  formatStyleRuleValuePreview,
  isThemeModeColorValue,
  isValidDimensionCustomValue,
  numericStyleInputMin,
  parseBoxLengthCustomValue,
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

  it("formats breakpoint overrides in the value preview", () => {
    expect(
      formatStyleRuleValuePreview({
        property: "fontSize",
        value: "16",
        valuesByBreakpoint: { base: "10" },
      }),
    ).toBe("16 · base:10");
  });

  it("preserves valuesByBreakpoint when upserting value", () => {
    const next = upsertStyleRule(
      [
        {
          property: "fontSize",
          value: "16",
          valuesByBreakpoint: { base: "10" },
        },
      ],
      0,
      { value: "18" },
    );
    expect(next[0]).toEqual({
      property: "fontSize",
      value: "18",
      valuesByBreakpoint: { base: "10" },
    });
  });

  it("can clear valuesByBreakpoint via upsert", () => {
    const next = upsertStyleRule(
      [
        {
          property: "fontSize",
          value: "16",
          valuesByBreakpoint: { base: "10" },
        },
      ],
      0,
      { valuesByBreakpoint: undefined },
    );
    expect(next[0]).toEqual({ property: "fontSize", value: "16" });
  });

  it("clears overrides when confirming a full draft that dropped valuesByBreakpoint", () => {
    const styles = [
      {
        property: "fontSize" as const,
        value: "20",
        valuesByBreakpoint: { md: "10" },
      },
    ];
    // CollapsibleStyleRulesEditor confirmEdit must pass valuesByBreakpoint explicitly
    // (even when undefined) so upsert clears the previous map.
    const next = upsertStyleRule(styles, 0, {
      property: "fontSize",
      value: "20",
      valuesByBreakpoint: undefined,
    });
    expect(next[0]).toEqual({ property: "fontSize", value: "20" });
  });

  it("keeps overrides when upsert patch omits valuesByBreakpoint key", () => {
    const next = upsertStyleRule(
      [
        {
          property: "fontSize",
          value: "20",
          valuesByBreakpoint: { md: "10" },
        },
      ],
      0,
      { property: "fontSize", value: "20" },
    );
    expect(next[0]).toEqual({
      property: "fontSize",
      value: "20",
      valuesByBreakpoint: { md: "10" },
    });
  });

  it("treats tenant custom token vars as theme mode colors", () => {
    const customColorOptions = [
      { label: "Widget surface", value: "var(--color-widget)" },
    ] as const;

    expect(
      isThemeModeColorValue("var(--color-widget)", customColorOptions),
    ).toBe(true);
    expect(isThemeModeColorValue("#ffffff", customColorOptions)).toBe(false);
    expect(isThemeModeColorValue("primary")).toBe(true);
  });

  it("accepts percent and auto box length custom values", () => {
    expect(isValidDimensionCustomValue("width", "100%")).toBe(true);
    expect(isValidDimensionCustomValue("width", "auto")).toBe(true);
    expect(isValidDimensionCustomValue("top", "auto")).toBe(true);
    expect(isValidDimensionCustomValue("gap", "100%")).toBe(false);
    expect(isValidDimensionCustomValue("borderRadius", "auto")).toBe(false);

    expect(parseBoxLengthCustomValue("width", "100%")).toEqual({
      amount: "100",
      unit: "%",
    });
    expect(parseBoxLengthCustomValue("top", "auto")).toEqual({
      amount: "",
      unit: "auto",
    });
    expect(formatBoxLengthCustomValue("width", "100", "%")).toBe("100%");
    expect(formatBoxLengthCustomValue("top", "", "auto")).toBe("auto");
  });
});
