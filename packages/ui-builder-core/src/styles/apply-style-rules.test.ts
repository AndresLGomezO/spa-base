import { describe, expect, it } from "vitest";

import {
  componentSlotWrapperClassName,
  flexWrapClassFromStyles,
  fontSizePxFromStyles,
  gapPxFromStyles,
  parseFlexLayoutFromStyles,
  resolvePageSlotWrapper,
  resolveStyleRules,
  spacingStyleFromStyleRules,
  splitStyleRuleClasses,
  textWrapClassFromStyles,
  usesFlexWrapLayout,
  usesTextWrap,
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

  it("applies per-corner border radius as inline styles", () => {
    const resolved = resolveStyleRules([
      { property: "borderTopLeftRadius", value: "0" },
      { property: "borderTopRightRadius", value: "8" },
      { property: "borderBottomLeftRadius", value: "16" },
      { property: "borderBottomRightRadius", value: "24" },
    ]);

    expect(resolved.style.borderTopLeftRadius).toBe("0px");
    expect(resolved.style.borderTopRightRadius).toBe("8px");
    expect(resolved.style.borderBottomLeftRadius).toBe("16px");
    expect(resolved.style.borderBottomRightRadius).toBe("24px");
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

  it("maps overflow axis rules to tailwind utilities", () => {
    const resolved = resolveStyleRules([
      { property: "overflowX", value: "hidden" },
      { property: "overflowY", value: "auto" },
    ]);

    expect(resolved.className).toContain("overflow-x-hidden");
    expect(resolved.className).toContain("overflow-y-auto");
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

  it("applies custom css colors as inline styles", () => {
    const resolved = resolveStyleRules([
      { property: "backgroundColor", value: "#112233" },
      { property: "color", value: "rgb(10, 20, 30)" },
      { property: "borderColor", value: "#445566" },
      { property: "borderWidth", value: "1" },
    ]);

    expect(resolved.style.backgroundColor).toBe("#112233");
    expect(resolved.style.color).toBe("rgb(10, 20, 30)");
    expect(resolved.style.borderColor).toBe("#445566");
    expect(resolved.className).not.toContain("bg-");
  });

  it("applies semantic css variable colors as inline styles", () => {
    const resolved = resolveStyleRules([
      { property: "backgroundColor", value: "var(--color-primary)" },
      { property: "color", value: "var(--color-muted-foreground)" },
    ]);

    expect(resolved.style.backgroundColor).toBe("var(--color-primary)");
    expect(resolved.style.color).toBe("var(--color-muted-foreground)");
    expect(resolved.className).not.toContain("bg-");
  });

  it("maps flexWrap to tailwind utilities", () => {
    expect(
      flexWrapClassFromStyles([{ property: "flexWrap", value: "wrap" }]),
    ).toBe("flex-wrap");

    const flex = parseFlexLayoutFromStyles([
      { property: "flexWrap", value: "wrap-reverse" },
    ]);
    expect(flex.wrap).toBe("wrap-reverse");
    expect(usesFlexWrapLayout([{ property: "flexWrap", value: "wrap" }])).toBe(
      true,
    );
    expect(
      componentSlotWrapperClassName([{ property: "flexWrap", value: "wrap" }]),
    ).toContain("flex-wrap");
  });

  it("applies borderStyle inline", () => {
    const resolved = resolveStyleRules([
      { property: "borderStyle", value: "dashed" },
      { property: "borderWidth", value: "2" },
    ]);
    expect(resolved.style.borderStyle).toBe("dashed");
    expect(resolved.style.borderWidth).toBe("2px");
  });

  it("defaults textWrap to truncate and supports wrap mode", () => {
    expect(textWrapClassFromStyles(undefined)).toBe("truncate");
    expect(
      textWrapClassFromStyles([{ property: "textWrap", value: "wrap" }]),
    ).toContain("break-words");
    expect(usesTextWrap([{ property: "textWrap", value: "wrap" }])).toBe(true);
    expect(usesTextWrap([{ property: "textWrap", value: "truncate" }])).toBe(
      false,
    );

    const wrapped = resolveStyleRules([
      { property: "textWrap", value: "wrap" },
    ]);
    expect(wrapped.className).toContain("break-words");
    expect(
      componentSlotWrapperClassName([{ property: "textWrap", value: "wrap" }]),
    ).toContain("shrink");
  });
});
