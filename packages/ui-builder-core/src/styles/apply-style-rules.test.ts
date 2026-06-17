import { describe, expect, it } from "vitest";

import {
  componentSlotWrapperClassName,
  containerRowWrapperClassName,
  flexWrapRowItemClassName,
  flexWrapClassFromStyles,
  fontSizePxFromStyles,
  gapPxFromStyles,
  inlineContentRowClassName,
  inlineFlexGrowStretchClassName,
  parseFlexLayoutFromStyles,
  prefersInlineContentWidth,
  resolveDashboardSectionShellClassName,
  resolvePageSlotWrapper,
  resolveStyleRules,
  resolveRowWrapperStyleRules,
  textWrapClassForLayoutShell,
  spacingStyleFromStyleRules,
  splitStyleRuleClasses,
  stackShellWidthClassName,
  stackShellLayoutClasses,
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

  it("applies negative margins as inline styles", () => {
    expect(
      spacingStyleFromStyleRules([{ property: "marginTop", value: "-40" }]),
    ).toEqual({ marginTop: "-40px" });
    expect(
      spacingStyleFromStyleRules([{ property: "paddingTop", value: "-4" }]),
    ).toEqual({});
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

  it("uses content width classes when flex is zero", () => {
    expect(
      componentSlotWrapperClassName([
        { property: "flex", value: "0" },
        { property: "alignSelf", value: "start" },
      ]),
    ).toBe("self-start flex-[0] w-fit max-w-full min-w-0 shrink-0");
  });

  it("maps flex grow onto slot wrappers", () => {
    expect(
      componentSlotWrapperClassName([{ property: "flex", value: "1" }]),
    ).toBe("flex-[1] min-w-0");
  });

  it("stretches inline flex-grow rows to full width in column stacks", () => {
    expect(
      inlineFlexGrowStretchClassName(
        { kind: "text", styles: [{ property: "flex", value: "1" }] },
        "column",
      ),
    ).toBe("w-full min-w-0 self-stretch");
    expect(
      inlineFlexGrowStretchClassName(
        { kind: "text", styles: [{ property: "flex", value: "1" }] },
        "row",
      ),
    ).toBe("");
    expect(
      inlineFlexGrowStretchClassName(
        { kind: "container", styles: [{ property: "flex", value: "1" }] },
        "column",
      ),
    ).toBe("");
  });

  it("uses fit width for column stacks aligned to start", () => {
    expect(
      stackShellWidthClassName(
        [{ property: "alignItems", value: "start" }],
        "column",
      ),
    ).toBe("w-fit max-w-full");
    expect(
      stackShellWidthClassName(
        [{ property: "alignItems", value: "end" }],
        "column",
      ),
    ).toBe("w-full");
    expect(
      stackShellWidthClassName(
        [{ property: "justifyContent", value: "end" }],
        "row",
      ),
    ).toBe("w-full");
  });

  it("builds stack shell classes with min-w-max when width hugs content", () => {
    expect(
      stackShellLayoutClasses(
        [{ property: "alignItems", value: "start" }],
        "column",
      ),
    ).toBe("flex min-w-max w-fit max-w-full");
  });

  it("keeps full width for default column stacks", () => {
    expect(stackShellWidthClassName(undefined, "column")).toBe("w-full");
  });

  it("resolves dashboard section shell width from component styles", () => {
    expect(resolveDashboardSectionShellClassName(undefined)).toBe(
      "h-auto min-w-0 max-w-full",
    );
    expect(
      resolveDashboardSectionShellClassName([{ property: "flex", value: "1" }]),
    ).toBe("h-auto min-w-0 w-full");
    expect(
      resolveDashboardSectionShellClassName([{ property: "flex", value: "0" }]),
    ).toBe("h-auto min-w-0 w-fit max-w-full");
  });

  it("sizes flex-wrap row items for responsive stacking", () => {
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        { type: "component", component: { kind: "container" } },
      ),
    ).toBe("min-w-0 max-w-full flex-[1_1_0] basis-0");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        { type: "component", component: { kind: "image" } },
      ),
    ).toBe("min-w-0 max-w-full shrink-0 grow-0 basis-auto");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: {
            kind: "dashboard-section",
            styles: [{ property: "flex", value: "0" }],
          },
        },
      ),
    ).toBe("w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto");
    expect(
      inlineContentRowClassName(
        { kind: "text", styles: [{ property: "fontWeight", value: "bold" }] },
        true,
      ),
    ).toBe("max-w-full shrink-0");
  });

  it("uses full width for row stacks that wrap", () => {
    expect(
      stackShellWidthClassName(
        [{ property: "flexWrap", value: "wrap" }],
        "row",
      ),
    ).toBe("w-full max-w-full min-w-0");
  });

  it("uses content width for text rows by default", () => {
    expect(
      prefersInlineContentWidth({
        kind: "text",
        styles: [{ property: "fontWeight", value: "bold" }],
      }),
    ).toBe(true);
    expect(
      inlineContentRowClassName({
        kind: "user",
        styles: [{ property: "fontSize", value: "35" }],
      }),
    ).toBe("w-fit max-w-full shrink-0");
    expect(
      prefersInlineContentWidth({
        kind: "text",
        styles: [{ property: "flex", value: "1" }],
      }),
    ).toBe(false);
  });

  it("uses full width for wrapping container row wrappers with flex zero", () => {
    expect(
      containerRowWrapperClassName(
        [
          { property: "flex", value: "0" },
          { property: "flexWrap", value: "wrap" },
        ],
        "row",
      ),
    ).toBe("w-full max-w-full min-w-0");
  });

  it("adds content width classes to container row wrappers", () => {
    expect(
      containerRowWrapperClassName([
        { property: "flex", value: "0" },
        { property: "alignSelf", value: "start" },
      ]),
    ).toBe("self-start w-fit max-w-full min-w-max shrink-0");
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

  it("does not default layout shells to truncate so focus rings stay visible", () => {
    expect(textWrapClassForLayoutShell(undefined)).toBe("");
    expect(
      resolveRowWrapperStyleRules([{ property: "paddingTop", value: "8" }])
        .className,
    ).not.toContain("truncate");
    expect(
      resolveRowWrapperStyleRules([{ property: "textWrap", value: "wrap" }])
        .className,
    ).toContain("break-words");
  });
});
