import { describe, expect, it } from "vitest";

import { styleRuleSchema } from "../schema/ui-layout-schema.js";
import {
  collapseStyleRulesAtBreakpoint,
  resolveStyleValueAtBreakpoint,
} from "./responsive-style-rules.js";
import type { StyleRule } from "./style-types.js";

describe("resolveStyleValueAtBreakpoint", () => {
  it("uses global value for all breakpoints when no overrides", () => {
    const rule: StyleRule = { property: "fontSize", value: "16" };
    for (const bp of ["base", "sm", "md", "lg", "xl"] as const) {
      expect(resolveStyleValueAtBreakpoint(rule, bp)).toBe("16");
    }
  });

  it("applies base-only override without fallback", () => {
    const rule: StyleRule = {
      property: "fontSize",
      valuesByBreakpoint: { base: "10" },
    };
    expect(resolveStyleValueAtBreakpoint(rule, "base")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "sm")).toBeUndefined();
    expect(resolveStyleValueAtBreakpoint(rule, "md")).toBeUndefined();
  });

  it("uses fallback after base-only override", () => {
    const rule: StyleRule = {
      property: "fontSize",
      value: "16",
      valuesByBreakpoint: { base: "10" },
    };
    expect(resolveStyleValueAtBreakpoint(rule, "base")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "sm")).toBe("16");
    expect(resolveStyleValueAtBreakpoint(rule, "xl")).toBe("16");
  });

  it("applies md through-override from base to md", () => {
    const rule: StyleRule = {
      property: "fontSize",
      valuesByBreakpoint: { md: "16" },
    };
    expect(resolveStyleValueAtBreakpoint(rule, "base")).toBe("16");
    expect(resolveStyleValueAtBreakpoint(rule, "sm")).toBe("16");
    expect(resolveStyleValueAtBreakpoint(rule, "md")).toBe("16");
    expect(resolveStyleValueAtBreakpoint(rule, "lg")).toBeUndefined();
    expect(resolveStyleValueAtBreakpoint(rule, "xl")).toBeUndefined();
  });

  it("picks the smallest covering through-key with fallback", () => {
    const rule: StyleRule = {
      property: "fontSize",
      value: "18",
      valuesByBreakpoint: { base: "10", md: "14" },
    };
    expect(resolveStyleValueAtBreakpoint(rule, "base")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "sm")).toBe("14");
    expect(resolveStyleValueAtBreakpoint(rule, "md")).toBe("14");
    expect(resolveStyleValueAtBreakpoint(rule, "lg")).toBe("18");
    expect(resolveStyleValueAtBreakpoint(rule, "xl")).toBe("18");
  });

  it("uses fallback above md when only md override is set", () => {
    const rule: StyleRule = {
      property: "fontSize",
      value: "20",
      valuesByBreakpoint: { md: "10" },
    };
    expect(resolveStyleValueAtBreakpoint(rule, "base")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "sm")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "md")).toBe("10");
    expect(resolveStyleValueAtBreakpoint(rule, "lg")).toBe("20");
    expect(resolveStyleValueAtBreakpoint(rule, "xl")).toBe("20");
  });
});

describe("collapseStyleRulesAtBreakpoint", () => {
  it("omits unset properties at the snapped breakpoint", () => {
    const styles: StyleRule[] = [
      {
        property: "fontSize",
        valuesByBreakpoint: { base: "10" },
      },
      { property: "fontWeight", value: "bold" },
    ];
    expect(collapseStyleRulesAtBreakpoint(styles, "base")).toEqual([
      { property: "fontSize", value: "10" },
      { property: "fontWeight", value: "bold" },
    ]);
    expect(collapseStyleRulesAtBreakpoint(styles, "md")).toEqual([
      { property: "fontWeight", value: "bold" },
    ]);
  });

  it("passes styles through when breakpoint is undefined", () => {
    const styles: StyleRule[] = [
      { property: "fontSize", value: "16", valuesByBreakpoint: { base: "10" } },
    ];
    expect(collapseStyleRulesAtBreakpoint(styles, undefined)).toBe(styles);
  });
});

describe("styleRuleSchema responsive values", () => {
  it("accepts legacy value-only rules", () => {
    expect(
      styleRuleSchema.parse({ property: "fontSize", value: "16" }),
    ).toEqual({ property: "fontSize", value: "16" });
  });

  it("accepts valuesByBreakpoint-only rules", () => {
    expect(
      styleRuleSchema.parse({
        property: "fontSize",
        valuesByBreakpoint: { base: "10" },
      }),
    ).toMatchObject({
      property: "fontSize",
      valuesByBreakpoint: { base: "10" },
    });
  });

  it("rejects empty rules", () => {
    expect(() =>
      styleRuleSchema.parse({ property: "fontSize" }),
    ).toThrowError();
  });
});
