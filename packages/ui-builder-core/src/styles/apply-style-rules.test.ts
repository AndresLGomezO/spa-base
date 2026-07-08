import { describe, expect, it } from "vitest";

import { matchConditionalStyles } from "../conditions/match-conditional-styles.js";
import {
  componentSlotWrapperClassName,
  containerRowWrapperClassName,
  flexWrapRowItemClassName,
  flexWrapClassFromStyles,
  fontSizePxFromStyles,
  gapPxFromStyles,
  gapStyleFromStyleRules,
  resolveGridGapCSSValue,
  inlineContentRowClassName,
  inlineFlexGrowStretchClassName,
  parseFlexLayoutFromStyles,
  prefersInlineContentWidth,
  resolveDashboardSectionShellClassName,
  resolveEmbeddableComponentRowClassName,
  resolveMetricWidgetShellClassName,
  rowPrefersContentWidth,
  resolvePageSlotWrapper,
  resolveStyleRules,
  resolveRowWrapperStyleRules,
  layoutInlineStyleFromStyleRules,
  textInlineStyleFromStyleRules,
  textWrapClassForLayoutShell,
  spacingStyleFromStyleRules,
  splitStyleRuleClasses,
  stackShellWidthClassName,
  stackShellLayoutClasses,
  stretchColumnStackShellClassName,
  rowSiblingContainerShellClassName,
  textWrapClassFromStyles,
  usesFlexWrapLayout,
  usesTextWrap,
} from "./apply-style-rules.js";
import {
  themeTokenBackgroundClass,
  themeTokenSwatchClass,
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

  it("maps theme token swatches to the same colors used at render time", () => {
    expect(themeTokenSwatchClass("background", "primary")).toBe(
      "bg-primary/10",
    );
    expect(themeTokenSwatchClass("text", "primary")).toBe("bg-primary");
    expect(themeTokenSwatchClass("text", "muted")).toBe("bg-muted-foreground");
    expect(themeTokenSwatchClass("border", "primary")).toBe("bg-primary");
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

  it("maps alignSelf end to main-axis bottom margin in column stacks", () => {
    expect(
      componentSlotWrapperClassName(
        [{ property: "alignSelf", value: "end" }],
        "column",
      ),
    ).toContain("mt-auto");
  });

  it("maps alignSelf center to main-axis centering in column stacks", () => {
    expect(
      componentSlotWrapperClassName(
        [{ property: "alignSelf", value: "center" }],
        "column",
      ),
    ).toBe("my-auto");
  });

  it("uses content width classes when flex is zero", () => {
    expect(
      componentSlotWrapperClassName([
        { property: "flex", value: "0" },
        { property: "alignSelf", value: "start" },
      ]),
    ).toBe(
      "self-start shrink-0 grow-0 basis-auto w-fit max-w-full min-w-0 shrink-0",
    );
  });

  it("uses content width classes when width is auto", () => {
    expect(
      componentSlotWrapperClassName([{ property: "width", value: "auto" }]),
    ).toBe("w-fit max-w-full min-w-0 shrink-0");
    expect(rowPrefersContentWidth([{ property: "width", value: "auto" }])).toBe(
      true,
    );
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

  it("uses stretch column shell classes for row sibling containers", () => {
    expect(stretchColumnStackShellClassName()).toBe(
      "flex min-h-0 min-w-0 h-full w-full flex-1 flex-col",
    );
    expect(rowSiblingContainerShellClassName()).toBe(
      "flex min-h-0 self-stretch flex-col",
    );
  });

  it("keeps full width for default column stacks", () => {
    expect(stackShellWidthClassName(undefined, "column")).toBe("w-full");
  });

  it("resolves dashboard section shell width from component styles", () => {
    expect(resolveDashboardSectionShellClassName(undefined)).toBe(
      "min-w-0 max-w-full shrink-0",
    );
    expect(
      resolveDashboardSectionShellClassName([{ property: "flex", value: "1" }]),
    ).toBe("min-w-0 max-w-full shrink-0 flex-1");
    expect(
      resolveDashboardSectionShellClassName([{ property: "flex", value: "0" }]),
    ).toBe("min-w-0 w-fit max-w-full shrink-0");
  });

  it("sizes flex-wrap row items for responsive stacking", () => {
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        { type: "component", component: { kind: "container" } },
      ),
    ).toBe("w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: {
            kind: "container",
            styles: [{ property: "flex", value: "1" }],
          },
        },
      ),
    ).toBe("min-w-0 max-w-full flex-[1_1_0] basis-0");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: {
            kind: "container",
            styles: [
              { property: "minWidth", value: "500" },
              { property: "maxWidth", value: "600" },
            ],
          },
        },
      ),
    ).toBe("min-w-0 max-w-full flex-[1_1_auto] basis-auto");
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
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: {
            kind: "metric-widget",
            styles: [{ property: "flex", value: "0" }],
          },
        },
      ),
    ).toBe("w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: {
            kind: "metric-widget",
            styles: [
              { property: "minWidth", value: "400" },
              { property: "maxWidth", value: "450" },
            ],
          },
        },
      ),
    ).toBe("min-w-0 max-w-full flex-[1_1_auto] basis-auto");
    expect(
      resolveMetricWidgetShellClassName([
        { property: "minWidth", value: "400" },
        { property: "maxWidth", value: "450" },
      ]),
    ).toBe("min-w-0 w-full max-w-full");
    expect(
      resolveEmbeddableComponentRowClassName(
        {
          kind: "metric-widget",
          styles: [
            { property: "minWidth", value: "170" },
            { property: "maxWidth", value: "200" },
          ],
        },
        "row",
      ),
    ).toBe("w-full min-w-0 max-w-full");
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

  it("uses content width for metric-kpi rows by default", () => {
    expect(
      prefersInlineContentWidth({
        kind: "metric-kpi",
        styles: [{ property: "padding", value: "8" }],
      }),
    ).toBe(true);
    expect(
      inlineContentRowClassName({
        kind: "metric-kpi",
        styles: [{ property: "padding", value: "8" }],
      }),
    ).toBe("w-fit max-w-full shrink-0");
    expect(
      flexWrapRowItemClassName(
        "row",
        [{ property: "flexWrap", value: "wrap" }],
        {
          type: "component",
          component: { kind: "metric-kpi", styles: [] },
        },
      ),
    ).toBe("w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto");
  });

  it("emits base fontSize as CSS var and media overrides (no inline fontSize)", () => {
    const resolved = resolveStyleRules([
      {
        property: "fontSize",
        value: "16",
        valuesByBreakpoint: { base: "10" },
      },
    ]);
    expect(resolved.style.fontSize).toBeUndefined();
    expect(resolved.cssText).toContain("--ub-font-size:10px");
    expect(resolved.cssText).toContain("font-size:var(--ub-font-size)");
    expect(resolved.cssText).toContain("@media (min-width:640px)");
    expect(resolved.cssText).toContain("--ub-font-size:16px");
    expect(resolved.className).toMatch(/ub-rs-/);
  });

  it("snaps fontSize when atBreakpoint is set", () => {
    const resolved = resolveStyleRules(
      [
        {
          property: "fontSize",
          value: "16",
          valuesByBreakpoint: { base: "10" },
        },
      ],
      { atBreakpoint: "md" },
    );
    expect(resolved.style.fontSize).toBe("16px");
    expect(resolved.cssText).toBeUndefined();
  });

  it("emits md through-override from base through md, then fallback", () => {
    const resolved = resolveStyleRules([
      {
        property: "fontSize",
        value: "20",
        valuesByBreakpoint: { md: "10" },
      },
    ]);
    expect(resolved.style.fontSize).toBeUndefined();
    expect(resolved.cssText).toContain("--ub-font-size:10px");
    expect(resolved.cssText).toContain("font-size:var(--ub-font-size)");
    expect(resolved.cssText).toContain("@media (min-width:1024px)");
    expect(resolved.cssText).toContain("--ub-font-size:20px");
    expect(resolved.cssText).not.toContain("@media (min-width:640px)");
    expect(resolved.cssText).not.toContain("@media (min-width:768px)");
  });

  it("emits stacked base and md overrides with fallback above md", () => {
    const resolved = resolveStyleRules([
      {
        property: "fontSize",
        value: "20",
        valuesByBreakpoint: { base: "5", md: "10" },
      },
    ]);
    expect(resolved.cssText).toContain("--ub-font-size:5px");
    expect(resolved.cssText).toContain("font-size:var(--ub-font-size)");
    expect(resolved.cssText).toContain("@media (min-width:640px)");
    expect(resolved.cssText).toContain("--ub-font-size:10px");
    expect(resolved.cssText).toContain("@media (min-width:1024px)");
    expect(resolved.cssText).toContain("--ub-font-size:20px");
  });

  it("resolveComponentRenderStyles uses CSS var for responsive fontSize", async () => {
    const { resolveComponentRenderStyles } =
      await import("./resolve-component-render-styles.js");
    const rendered = resolveComponentRenderStyles([
      {
        property: "fontSize",
        value: "20",
        valuesByBreakpoint: { base: "10" },
      },
    ]);
    expect(rendered.textSize).toBeUndefined();
    expect(rendered.valueStyle.fontSize).toBe("var(--ub-font-size)");
    expect(rendered.cssText).toContain("--ub-font-size:10px");
    expect(rendered.cssText).toContain("--ub-font-size:20px");
  });

  it("uses full width for overlay image rows instead of w-fit", () => {
    expect(
      prefersInlineContentWidth({
        kind: "image",
        displayMode: "overlay",
      }),
    ).toBe(false);
    expect(
      inlineContentRowClassName({
        kind: "image",
        displayMode: "overlay",
      }),
    ).toBe("");
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

  it("resolveGridGapCSSValue prefers explicit gap over style rules", () => {
    expect(
      resolveGridGapCSSValue("32", [{ property: "gap", value: "20" }]),
    ).toBe("32px");
    expect(
      resolveGridGapCSSValue(undefined, [{ property: "gap", value: "20" }]),
    ).toBe("20px");
  });

  it("snaps flexWrap at preview breakpoint and emits CSS for production", async () => {
    const {
      resolveLayoutSpacingProps,
      flexWrapClassFromStyles,
      usesFlexWrapLayout,
    } = await import("./apply-style-rules.js");
    const rule = {
      property: "flexWrap" as const,
      value: "wrap",
      valuesByBreakpoint: { md: "nowrap" },
    };

    expect(flexWrapClassFromStyles([rule], "base")).toBe("");
    expect(flexWrapClassFromStyles([rule], "md")).toBe("");
    expect(flexWrapClassFromStyles([rule], "lg")).toBe("flex-wrap");
    expect(flexWrapClassFromStyles([rule])).toBe("");
    expect(usesFlexWrapLayout([rule], "md")).toBe(false);
    expect(usesFlexWrapLayout([rule], "lg")).toBe(true);
    expect(usesFlexWrapLayout([rule])).toBe(true);

    const preview = resolveLayoutSpacingProps([rule], "md");
    expect(preview.gap).toBe(0);
    expect(preview.cssText).toBeUndefined();

    const production = resolveLayoutSpacingProps([rule]);
    expect(production.cssText).toContain("flex-wrap:nowrap");
    expect(production.cssText).toContain("@media (min-width:1024px)");
    expect(production.cssText).toContain("flex-wrap:wrap");
    expect(production.className).toMatch(/ub-rs-/);
  });

  it("snaps gap at preview breakpoint and emits CSS for production", async () => {
    const { resolveGapLayoutProps, resolveLayoutSpacingProps } =
      await import("./apply-style-rules.js");
    const rule = {
      property: "gap" as const,
      value: "20",
      valuesByBreakpoint: { md: "8" },
    };

    expect(gapPxFromStyles([rule], "base")).toBe(8);
    expect(gapPxFromStyles([rule], "lg")).toBe(20);
    expect(gapStyleFromStyleRules([rule])).toBeUndefined();
    expect(resolveGridGapCSSValue(undefined, [rule])).toBeUndefined();
    expect(resolveGridGapCSSValue(undefined, [rule], "base")).toBe("8px");
    expect(resolveGridGapCSSValue(undefined, [rule], "lg")).toBe("20px");

    const preview = resolveGapLayoutProps([rule], "md");
    expect(preview.gap).toBe(8);
    expect(preview.cssText).toBeUndefined();

    const production = resolveLayoutSpacingProps([rule]);
    expect(production.gap).toBeNull();
    expect(production.cssText).toContain("gap:8px");
    expect(production.cssText).toContain("@media (min-width:1024px)");
    expect(production.cssText).toContain("gap:20px");
    expect(production.className).toMatch(/ub-rs-/);
  });

  it("omits any property with valuesByBreakpoint from flat inline styles", () => {
    const styles = [
      {
        property: "padding" as const,
        value: "24",
        valuesByBreakpoint: { md: "8" },
      },
      {
        property: "width" as const,
        value: "400",
        valuesByBreakpoint: { base: "200" },
      },
      { property: "marginTop" as const, value: "12" },
    ];

    const flat = layoutInlineStyleFromStyleRules(styles);
    expect(flat.padding).toBeUndefined();
    expect(flat.width).toBeUndefined();
    expect(flat.marginTop).toBe("12px");

    const atMd = layoutInlineStyleFromStyleRules(styles, "md");
    expect(atMd.padding).toBe("8px");
    expect(atMd.width).toBe("400px");
    expect(atMd.marginTop).toBe("12px");
  });

  it("emits media CSS for spacing, flex, and theme-token color overrides", () => {
    const resolved = resolveStyleRules([
      {
        property: "padding",
        value: "24",
        valuesByBreakpoint: { md: "8" },
      },
      {
        property: "alignItems",
        value: "center",
        valuesByBreakpoint: { base: "start" },
      },
      {
        property: "backgroundColor",
        value: "primary",
        valuesByBreakpoint: { base: "muted" },
      },
      {
        property: "boxShadow",
        value: "card",
        valuesByBreakpoint: { md: "none" },
      },
    ]);

    expect(resolved.style.padding).toBeUndefined();
    expect(resolved.cssText).toContain("padding:8px");
    expect(resolved.cssText).toContain("padding:24px");
    expect(resolved.cssText).toContain("align-items:flex-start");
    expect(resolved.cssText).toContain("align-items:center");
    expect(resolved.cssText).toContain("background-color:var(--color-muted)");
    expect(resolved.cssText).toContain(
      "background-color:color-mix(in oklab, var(--color-primary) 10%, transparent)",
    );
    expect(resolved.cssText).toContain("box-shadow:none");
    expect(resolved.cssText).toContain("box-shadow:var(--shadow-card)");
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

  it("applies color-mix backgrounds as inline styles", () => {
    const tint =
      "color-mix(in oklch, var(--color-destructive) 14%, transparent)";
    const resolved = resolveStyleRules([
      { property: "backgroundColor", value: tint },
    ]);

    expect(resolved.style.backgroundColor).toBe(tint);
    expect(resolved.className).not.toContain("bg-");
  });

  it("applies gradient backgrounds via the background property", () => {
    expect(
      resolveStyleRules([
        { property: "backgroundColor", value: "var(--gradient-primary)" },
      ]).style,
    ).toEqual({ background: "var(--gradient-primary)" });

    expect(
      resolveStyleRules([
        {
          property: "backgroundColor",
          value: "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
        },
      ]).style.background,
    ).toBe("linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)");
  });

  it("maps conditional gradient backgrounds to inline background styles", () => {
    expect(
      matchConditionalStyles("ACTIVE", [
        {
          matchValue: "ACTIVE",
          background: "var(--gradient-primary)",
        },
      ]).style,
    ).toEqual({ background: "var(--gradient-primary)" });
  });

  it("maps boxShadow theme tokens to tailwind shadow utilities", () => {
    expect(
      resolveStyleRules([{ property: "boxShadow", value: "card" }]).className,
    ).toContain("shadow-card");
    expect(
      resolveStyleRules([{ property: "boxShadow", value: "none" }]).className,
    ).toContain("shadow-none");
  });

  it("applies custom boxShadow and theme dimension tokens inline", () => {
    expect(
      resolveStyleRules([
        { property: "boxShadow", value: "var(--shadow-card)" },
        { property: "borderRadius", value: "var(--radius-lg)" },
        { property: "fontSize", value: "var(--text-body)" },
        { property: "fontFamily", value: "var(--font-sans)" },
      ]).style,
    ).toEqual({
      boxShadow: "var(--shadow-card)",
      borderRadius: "var(--radius-lg)",
      fontSize: "var(--text-body)",
      fontFamily: "var(--font-sans)",
    });
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

  it("applies box layout and effect styles inline", () => {
    expect(
      layoutInlineStyleFromStyleRules([
        { property: "width", value: "100%" },
        { property: "height", value: "200" },
        { property: "position", value: "absolute" },
        { property: "zIndex", value: "3" },
        { property: "opacity", value: "80" },
        { property: "backdropFilter", value: "blur(8px)" },
      ]),
    ).toEqual({
      width: "100%",
      height: "200px",
      position: "absolute",
      zIndex: "3",
      opacity: "0.8",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    });
  });

  it("accepts decimal opacity values between 0 and 1", () => {
    expect(
      layoutInlineStyleFromStyleRules([{ property: "opacity", value: "0.8" }]),
    ).toEqual({ opacity: "0.8" });
  });

  it("applies letter spacing on text inline styles", () => {
    expect(
      textInlineStyleFromStyleRules([
        { property: "letterSpacing", value: "2" },
        { property: "opacity", value: "50" },
      ]),
    ).toEqual({
      letterSpacing: "2px",
      opacity: "0.5",
    });
  });
});
