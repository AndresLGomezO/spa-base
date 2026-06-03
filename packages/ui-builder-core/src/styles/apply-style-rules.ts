import type { StyleRule, StylePropertyKey, ThemeToken } from "./style-types.js";
import {
  themeTokenBackgroundClass,
  themeTokenBorderClass,
  themeTokenTextClass,
} from "./theme-token-classes.js";

export interface SpacingInlineStyle {
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  padding?: string;
}

/** Inline layout styles for pixel-based rules (avoids Tailwind arbitrary class scanning). */
export interface LayoutInlineStyle extends SpacingInlineStyle {
  borderRadius?: string;
  minWidth?: string;
  maxWidth?: string;
  borderWidth?: string;
  borderStyle?: string;
}

const TEXT_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "color",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
]);

/** Pixel font size from style rules; applied via inline `fontSize`, not Tailwind. */
export const FONT_SIZE_STYLE_PROPERTY: StylePropertyKey = "fontSize";

/** Flex-axis rules handled by layout stacks / slot wrappers, not plain divs. */
export const FLEX_LAYOUT_PROPERTIES = new Set<StylePropertyKey>([
  "alignItems",
  "justifyContent",
  "alignSelf",
]);

/** Applied by layout primitives (`LayoutGrid` / `LayoutStack`), not wrapper classNames. */
export const LAYOUT_CONTAINER_PROPERTIES = new Set<StylePropertyKey>([
  ...FLEX_LAYOUT_PROPERTIES,
  "gap",
]);

/** Margin/padding — applied as inline styles, not Tailwind arbitrary classes. */
export const SPACING_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "padding",
]);

/** Applied as inline styles instead of `rounded-[Npx]` / `min-w-[Npx]` arbitrary utilities. */
const PIXEL_INLINE_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  ...SPACING_STYLE_PROPERTIES,
  "borderRadius",
  "minWidth",
  "maxWidth",
  "borderWidth",
]);

export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between";

function isThemeToken(value: string): value is ThemeToken {
  return (
    value === "default" ||
    value === "muted" ||
    value === "primary" ||
    value === "success" ||
    value === "warning" ||
    value === "danger" ||
    value === "info" ||
    value === "background" ||
    value === "foreground" ||
    value === "transparent"
  );
}

function ruleToClass(rule: StyleRule): string | undefined {
  const { property, value } = rule;
  const raw = String(value);

  if (property === "backgroundColor" && isThemeToken(raw)) {
    return themeTokenBackgroundClass(raw);
  }

  if (property === "color" && isThemeToken(raw)) {
    return themeTokenTextClass(raw);
  }

  if (property === "borderColor" && isThemeToken(raw)) {
    return themeTokenBorderClass(raw);
  }

  if (property === "fontWeight" && raw === "bold") {
    return "font-bold";
  }

  if (property === "fontWeight" && raw === "thin") {
    return "font-normal";
  }

  if (property === "fontStyle" && raw === "italic") {
    return "italic";
  }

  if (property === "textDecoration" && raw === "underline") {
    return "underline";
  }

  if (property === "textAlign") {
    if (raw === "left") return "text-left";
    if (raw === "center") return "text-center";
    if (raw === "right") return "text-right";
  }

  if (property === "alignItems") {
    if (raw === "start") return "items-start";
    if (raw === "center") return "items-center";
    if (raw === "end") return "items-end";
    if (raw === "stretch") return "items-stretch";
  }

  if (property === "justifyContent") {
    if (raw === "start") return "justify-start";
    if (raw === "center") return "justify-center";
    if (raw === "end") return "justify-end";
    if (raw === "between") return "justify-between";
  }

  if (property === "alignSelf") {
    if (raw === "start") return "self-start";
    if (raw === "center") return "self-center";
    if (raw === "end") return "self-end";
    if (raw === "stretch") return "self-stretch";
  }

  if (property === "gap") {
    const px = Number.parseInt(raw, 10);
    if (Number.isFinite(px)) {
      return `gap-[${px}px]`;
    }
  }

  if (property === "flex") {
    return `flex-[${raw}]`;
  }

  return undefined;
}

function classesFromRules(
  styles: readonly StyleRule[] | undefined,
  filter: (rule: StyleRule) => boolean,
): string[] {
  return (styles ?? [])
    .filter(filter)
    .map(ruleToClass)
    .filter((value): value is string => value !== undefined);
}

export interface SplitStyleRuleClasses {
  readonly containerClassName: string;
  readonly textClassName: string;
}

function parseFlexAlign(value: string): FlexAlign | undefined {
  if (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "stretch"
  ) {
    return value;
  }
  return undefined;
}

function parseFlexJustify(value: string): FlexJustify | undefined {
  if (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "between"
  ) {
    return value;
  }
  return undefined;
}

export interface FlexLayoutFromStyles {
  readonly align?: FlexAlign;
  readonly justify?: FlexJustify;
  readonly selfClassName: string;
  readonly slotFlexClassName: string;
}

export function parseFlexLayoutFromStyles(
  styles: readonly StyleRule[] | undefined,
): FlexLayoutFromStyles {
  let align: FlexAlign | undefined;
  let justify: FlexJustify | undefined;
  const selfClasses: string[] = [];
  const slotFlexClasses: string[] = [];

  for (const rule of styles ?? []) {
    const raw = String(rule.value);
    if (rule.property === "alignItems") {
      align = parseFlexAlign(raw) ?? align;
      const cls = ruleToClass(rule);
      if (cls) {
        slotFlexClasses.push(cls);
      }
    } else if (rule.property === "justifyContent") {
      justify = parseFlexJustify(raw) ?? justify;
      const cls = ruleToClass(rule);
      if (cls) {
        slotFlexClasses.push(cls);
      }
    } else if (rule.property === "alignSelf") {
      const cls = ruleToClass(rule);
      if (cls) {
        selfClasses.push(cls);
      }
    }
  }

  const slotFlexClassName =
    slotFlexClasses.length > 0
      ? ["flex", "w-full", ...slotFlexClasses].join(" ")
      : "";

  return {
    align,
    justify,
    selfClassName: selfClasses.join(" "),
    slotFlexClassName,
  };
}

export function componentSlotWrapperClassName(
  styles: readonly StyleRule[] | undefined,
): string {
  const flex = parseFlexLayoutFromStyles(styles);
  return [flex.selfClassName, flex.slotFlexClassName].filter(Boolean).join(" ");
}

/** Pixel font size for card field values; undefined when no valid `fontSize` rule. */
export function fontSizePxFromStyles(
  styles: readonly StyleRule[] | undefined,
): number | undefined {
  const fontSizeRule = styles?.find(
    (rule) => rule.property === FONT_SIZE_STYLE_PROPERTY,
  );
  if (!fontSizeRule) {
    return undefined;
  }

  const px = Number.parseInt(String(fontSizeRule.value), 10);
  return Number.isFinite(px) && px > 0 ? px : undefined;
}

/** Pixel gap for `LayoutGrid` / `LayoutStack`; defaults to 0 when no `gap` style rule. */
export function gapPxFromStyles(
  styles: readonly StyleRule[] | undefined,
): number {
  const gapRule = styles?.find((rule) => rule.property === "gap");
  if (!gapRule) {
    return 0;
  }

  const px = Number.parseInt(String(gapRule.value), 10);
  return Number.isFinite(px) && px >= 0 ? px : 0;
}

/** Inline margin/padding from style rules. */
export function spacingStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
): SpacingInlineStyle {
  const style: SpacingInlineStyle = {};

  for (const rule of styles ?? []) {
    if (!SPACING_STYLE_PROPERTIES.has(rule.property)) {
      continue;
    }

    const px = Number.parseInt(String(rule.value), 10);
    if (!Number.isFinite(px) || px < 0) {
      continue;
    }

    const value = `${px}px`;
    switch (rule.property) {
      case "marginTop":
        style.marginTop = value;
        break;
      case "marginBottom":
        style.marginBottom = value;
        break;
      case "marginLeft":
        style.marginLeft = value;
        break;
      case "marginRight":
        style.marginRight = value;
        break;
      case "paddingTop":
        style.paddingTop = value;
        break;
      case "paddingBottom":
        style.paddingBottom = value;
        break;
      case "paddingLeft":
        style.paddingLeft = value;
        break;
      case "paddingRight":
        style.paddingRight = value;
        break;
      case "padding":
        style.padding = value;
        break;
      default:
        break;
    }
  }

  return style;
}

function parseNonNegativePx(value: string | ThemeToken): number | undefined {
  const px = Number.parseInt(String(value), 10);
  return Number.isFinite(px) && px >= 0 ? px : undefined;
}

/** Spacing plus pixel dimensions (border radius, min/max width, border width). */
export function layoutInlineStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
): LayoutInlineStyle {
  const style: LayoutInlineStyle = {
    ...spacingStyleFromStyleRules(styles),
  };

  for (const rule of styles ?? []) {
    const px = parseNonNegativePx(rule.value);
    if (px === undefined) {
      continue;
    }

    switch (rule.property) {
      case "borderRadius":
        style.borderRadius = `${px}px`;
        break;
      case "minWidth":
        style.minWidth = `${px}px`;
        break;
      case "maxWidth":
        style.maxWidth = `${px}px`;
        break;
      case "borderWidth":
        if (px > 0) {
          style.borderWidth = `${px}px`;
          style.borderStyle = style.borderStyle ?? "solid";
        }
        break;
      default:
        break;
    }
  }

  return style;
}

export interface ResolvedStyleRules {
  readonly className: string;
  readonly style: LayoutInlineStyle;
}

export function resolveStyleRules(
  styles: readonly StyleRule[] | undefined,
  baseClassName?: string,
): ResolvedStyleRules {
  const split = splitStyleRuleClasses(styles, baseClassName);
  return {
    className: [split.containerClassName, split.textClassName]
      .filter(Boolean)
      .join(" "),
    style: layoutInlineStyleFromStyleRules(styles),
  };
}

/**
 * Resolves wrapper class + inline spacing for main-page slot components
 * (`page-toolbar`, `page-metrics`, `page-list`, `page-header`).
 * Includes layout/position tokens (flex alignment, gap, min/max width) and
 * theme backgrounds, not only margin/padding.
 */
export function resolvePageSlotWrapper(
  styles: readonly StyleRule[] | undefined,
  baseClassName?: string,
): ResolvedStyleRules {
  const containerClasses = classesFromRules(
    styles,
    (rule) =>
      !TEXT_STYLE_PROPERTIES.has(rule.property) &&
      !PIXEL_INLINE_STYLE_PROPERTIES.has(rule.property),
  );
  const flexWrapper = componentSlotWrapperClassName(styles);

  return {
    className: [
      baseClassName,
      "w-full min-w-0",
      flexWrapper,
      ...containerClasses,
    ]
      .filter(Boolean)
      .join(" "),
    style: layoutInlineStyleFromStyleRules(styles),
  };
}

export function splitStyleRuleClasses(
  styles: readonly StyleRule[] | undefined,
  baseClassName?: string,
): SplitStyleRuleClasses {
  const container = classesFromRules(
    styles,
    (rule) =>
      !TEXT_STYLE_PROPERTIES.has(rule.property) &&
      !LAYOUT_CONTAINER_PROPERTIES.has(rule.property) &&
      !PIXEL_INLINE_STYLE_PROPERTIES.has(rule.property),
  );
  const text = classesFromRules(styles, (rule) =>
    TEXT_STYLE_PROPERTIES.has(rule.property),
  );

  return {
    containerClassName: [baseClassName, ...container].filter(Boolean).join(" "),
    textClassName: text.join(" "),
  };
}

export function applyStyleRules(
  styles: readonly StyleRule[] | undefined,
  className?: string,
): string {
  return resolveStyleRules(styles, className).className;
}
