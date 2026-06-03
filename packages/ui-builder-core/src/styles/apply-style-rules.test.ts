import { describe, expect, it } from "vitest";

import {
  componentSlotWrapperClassName,
  fontSizePxFromStyles,
  gapPxFromStyles,
  parseFlexLayoutFromStyles,
  resolvePageSlotWrapper,
  resolveStyleRules,
  spacingStyleFromStyleRules,
  splitStyleRuleClasses,
} from "./apply-style-rules.js";
import {
  themeTokenBackgroundClass,
  themeTokenTextClass,
} from "./theme-token-classes.js";

describe("applyStyleRules", () => {
  it("applies border radius, width, and color", () => {
    const resolved = resolveStyleRules([
      { property: "borderRadius", value: "8" },
      { property: "borderWidth", value: "2" },
      { property: "borderColor", value: "primary" },
    ]);

    expect(resolved.style.borderRadius).toBe("8px");
    expect(resolved.style.borderWidth).toBe("2px");
    expect(resolved.style.borderStyle).toBe("solid");
    expect(resolved.className).toContain("border-primary");
    expect(resolved.className).not.toContain("rounded-[");
  });

  it("applies arbitrary border radius values as inline styles", () => {
    const resolved = resolveStyleRules([
      { property: "borderRadius", value: "16" },
    ]);
    expect(resolved.style.borderRadius).toBe("16px");
  });

  it("maps semantic tokens to theme utilities", () => {
    expect(themeTokenTextClass("success")).toBe("text-success");
    expect(themeTokenTextClass("danger")).toBe("text-destructive");
    expect(themeTokenBackgroundClass("danger")).toBe("bg-destructive/10");
  });

  it("puts text color rules on the value class list", () => {
    const split = splitStyleRuleClasses([
      { property: "color", value: "success" },
      { property: "padding", value: "8" },
    ]);

    expect(split.textClassName).toBe("text-success");
    expect(split.containerClassName).toBe("");
    expect(
      spacingStyleFromStyleRules([{ property: "padding", value: "8" }]),
    ).toEqual({ padding: "8px" });
  });

  it("applies margin and padding as inline styles", () => {
    const resolved = resolveStyleRules([
      { property: "paddingTop", value: "12" },
      { property: "marginLeft", value: "16" },
      { property: "backgroundColor", value: "muted" },
    ]);

    expect(resolved.style).toEqual({
      paddingTop: "12px",
      marginLeft: "16px",
    });
    expect(resolved.className).toContain("bg-muted");
    expect(resolved.className).not.toContain("pt-[");
  });

  it("routes column flex alignment to layout stack props", () => {
    const flex = parseFlexLayoutFromStyles([
      { property: "alignItems", value: "center" },
      { property: "justifyContent", value: "end" },
    ]);

    expect(flex.align).toBe("center");
    expect(flex.justify).toBe("end");
  });

  it("builds a flex slot wrapper for component alignment", () => {
    expect(
      componentSlotWrapperClassName([
        { property: "alignItems", value: "center" },
        { property: "justifyContent", value: "center" },
      ]),
    ).toBe("flex w-full items-center justify-center");
  });

  it("maps alignSelf for flex row children", () => {
    expect(
      componentSlotWrapperClassName([
        { property: "alignSelf", value: "center" },
      ]),
    ).toBe("self-center");
  });

  it("reads gap from styles for layout primitives only", () => {
    expect(gapPxFromStyles(undefined)).toBe(0);
    expect(gapPxFromStyles([{ property: "gap", value: "16" }])).toBe(16);

    const split = splitStyleRuleClasses([{ property: "gap", value: "12" }]);
    expect(split.containerClassName).toBe("");
  });

  it("reads fontSize as pixels for inline styles, not Tailwind classes", () => {
    expect(fontSizePxFromStyles(undefined)).toBeUndefined();
    expect(fontSizePxFromStyles([{ property: "fontSize", value: "16" }])).toBe(
      16,
    );
    expect(fontSizePxFromStyles([{ property: "fontSize", value: "0" }])).toBe(
      undefined,
    );

    const split = splitStyleRuleClasses([
      { property: "fontSize", value: "20" },
    ]);
    expect(split.textClassName).toBe("");
    expect(split.containerClassName).toBe("");
  });

  it("resolvePageSlotWrapper applies spacing, background, and flex position", () => {
    const wrapper = resolvePageSlotWrapper([
      { property: "paddingTop", value: "12" },
      { property: "backgroundColor", value: "muted" },
      { property: "justifyContent", value: "center" },
      { property: "minWidth", value: "320" },
      { property: "borderRadius", value: "12" },
    ]);

    expect(wrapper.style.paddingTop).toBe("12px");
    expect(wrapper.style.minWidth).toBe("320px");
    expect(wrapper.style.borderRadius).toBe("12px");
    expect(wrapper.className).toContain("bg-muted");
    expect(wrapper.className).toContain("justify-center");
    expect(wrapper.className).toContain("w-full");
  });
});
