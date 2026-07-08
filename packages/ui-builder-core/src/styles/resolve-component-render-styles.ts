import {
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  resolveStyleRules,
  splitStyleRuleClasses,
  textInlineStyleFromStyleRules,
  type LayoutInlineStyle,
  type TextInlineStyle,
} from "./apply-style-rules.js";
import {
  collapseStyleRulesAtBreakpoint,
  stylesHaveBreakpointOverrides,
  type StyleBreakpoint,
} from "./responsive-style-rules.js";
import type { StyleRule } from "./style-types.js";

/** CSS custom property used so value text can follow responsive fontSize without inline px. */
export const RESPONSIVE_FONT_SIZE_CSS_VAR = "--ub-font-size";

export interface ComponentRenderStyles {
  readonly containerClassName: string;
  readonly textClassName: string;
  readonly containerStyle: LayoutInlineStyle;
  readonly valueStyle: TextInlineStyle;
  readonly textSize: number | undefined;
  readonly cssText?: string;
}

function hasResponsiveFontSizeRule(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (
    styles?.some(
      (rule) =>
        rule.property === "fontSize" &&
        rule.valuesByBreakpoint !== undefined &&
        Object.values(rule.valuesByBreakpoint).some((v) => v !== undefined),
    ) ?? false
  );
}

function stripFontSize(style: TextInlineStyle): TextInlineStyle {
  if (style.fontSize === undefined) {
    return style;
  }
  const { fontSize: _fontSize, ...rest } = style;
  return rest;
}

/**
 * Resolves component styles for preview (snapped breakpoint) or production
 * (mobile-first CSS emission when valuesByBreakpoint is present).
 */
export function resolveComponentRenderStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): ComponentRenderStyles {
  if (atBreakpoint !== undefined) {
    const flat = collapseStyleRulesAtBreakpoint(styles, atBreakpoint);
    const split = splitStyleRuleClasses(flat);
    return {
      containerClassName: split.containerClassName,
      textClassName: split.textClassName,
      containerStyle: layoutInlineStyleFromStyleRules(flat),
      valueStyle: textInlineStyleFromStyleRules(flat),
      textSize: fontSizePxFromStyles(flat),
    };
  }

  if (stylesHaveBreakpointOverrides(styles)) {
    const resolved = resolveStyleRules(styles);
    const textSplit = splitStyleRuleClasses(
      collapseStyleRulesAtBreakpoint(styles, "base"),
    );
    const baseValueStyle = textInlineStyleFromStyleRules(
      collapseStyleRulesAtBreakpoint(styles, "base"),
    );
    const responsiveFontSize = hasResponsiveFontSizeRule(styles);

    return {
      containerClassName: resolved.className,
      textClassName: textSplit.textClassName,
      containerStyle: resolved.style,
      // Drive value font-size via CSS var set by scoped responsive cssText — never a fixed px.
      valueStyle: responsiveFontSize
        ? {
            ...stripFontSize(baseValueStyle),
            fontSize: `var(${RESPONSIVE_FONT_SIZE_CSS_VAR})`,
          }
        : baseValueStyle,
      textSize: responsiveFontSize
        ? undefined
        : fontSizePxFromStyles(collapseStyleRulesAtBreakpoint(styles, "base")),
      cssText: resolved.cssText,
    };
  }

  const split = splitStyleRuleClasses(styles);
  return {
    containerClassName: split.containerClassName,
    textClassName: split.textClassName,
    containerStyle: layoutInlineStyleFromStyleRules(styles),
    valueStyle: textInlineStyleFromStyleRules(styles),
    textSize: fontSizePxFromStyles(styles),
  };
}
