import type { StyleRule, StylePropertyKey, ThemeToken } from "./style-types.js";
import { isCssColorValue, isThemeTokenValue } from "./color-values.js";
import {
  isMarginStyleProperty,
  parseMarginPx,
  parseNonNegativeSpacingPx,
} from "./spacing-style-values.js";
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
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomLeftRadius?: string;
  borderBottomRightRadius?: string;
  minWidth?: string;
  maxWidth?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  backgroundColor?: string;
  color?: string;
}

export interface TextInlineStyle {
  fontSize?: string;
  color?: string;
}

const TEXT_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "color",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
]);

const COLOR_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "backgroundColor",
  "color",
  "borderColor",
]);

/** Pixel font size from style rules; applied via inline `fontSize`, not Tailwind. */
export const FONT_SIZE_STYLE_PROPERTY: StylePropertyKey = "fontSize";

/** Flex-axis rules handled by layout stacks / slot wrappers, not plain divs. */
export const FLEX_LAYOUT_PROPERTIES = new Set<StylePropertyKey>([
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flexWrap",
]);

/** Applied by layout primitives (`LayoutGrid` / `LayoutStack`), not wrapper classNames. */
export const LAYOUT_CONTAINER_PROPERTIES = new Set<StylePropertyKey>([
  ...FLEX_LAYOUT_PROPERTIES,
  "gap",
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
  "gridAutoFitMinWidth",
  "gridResponsiveMode",
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
const BORDER_RADIUS_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
]);

const PIXEL_INLINE_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  ...SPACING_STYLE_PROPERTIES,
  ...BORDER_RADIUS_STYLE_PROPERTIES,
  "minWidth",
  "maxWidth",
  "borderWidth",
]);

export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between";
export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";

function isThemeToken(value: string): value is ThemeToken {
  return isThemeTokenValue(value);
}

function ruleToClass(rule: StyleRule): string | undefined {
  const { property, value } = rule;
  const raw = String(value);

  if (COLOR_STYLE_PROPERTIES.has(property) && isCustomColorRule(rule)) {
    return undefined;
  }

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

  if (property === "textWrap") {
    if (raw === "wrap") {
      return "min-w-0 max-w-full break-words whitespace-normal";
    }
    if (raw === "truncate") {
      return "truncate";
    }
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

  if (property === "flexWrap") {
    if (raw === "wrap") return "flex-wrap";
    if (raw === "wrap-reverse") return "flex-wrap-reverse";
    if (raw === "nowrap") return "flex-nowrap";
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

  if (property === "overflowX") {
    if (raw === "visible") return "overflow-x-visible";
    if (raw === "hidden") return "overflow-x-hidden";
    if (raw === "scroll") return "overflow-x-scroll";
    if (raw === "auto") return "overflow-x-auto";
  }

  if (property === "overflowY") {
    if (raw === "visible") return "overflow-y-visible";
    if (raw === "hidden") return "overflow-y-hidden";
    if (raw === "scroll") return "overflow-y-scroll";
    if (raw === "auto") return "overflow-y-auto";
  }

  return undefined;
}

function isCustomColorRule(rule: StyleRule): boolean {
  return isCssColorValue(String(rule.value));
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

function parseFlexWrap(value: string): FlexWrap | undefined {
  if (value === "nowrap" || value === "wrap" || value === "wrap-reverse") {
    return value;
  }
  return undefined;
}

export interface FlexLayoutFromStyles {
  readonly align?: FlexAlign;
  readonly justify?: FlexJustify;
  readonly wrap?: FlexWrap;
  readonly selfClassName: string;
  readonly slotFlexClassName: string;
}

export function parseFlexLayoutFromStyles(
  styles: readonly StyleRule[] | undefined,
): FlexLayoutFromStyles {
  let align: FlexAlign | undefined;
  let justify: FlexJustify | undefined;
  let wrap: FlexWrap | undefined;
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
    } else if (rule.property === "flexWrap") {
      wrap = parseFlexWrap(raw) ?? wrap;
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
    wrap,
    selfClassName: selfClasses.join(" "),
    slotFlexClassName,
  };
}

export function usesFlexWrapLayout(
  styles: readonly StyleRule[] | undefined,
): boolean {
  const wrap = parseFlexLayoutFromStyles(styles).wrap;
  return wrap === "wrap" || wrap === "wrap-reverse";
}

export function flexWrapClassFromStyles(
  styles: readonly StyleRule[] | undefined,
): string {
  const wrap = parseFlexLayoutFromStyles(styles).wrap;
  if (wrap === "wrap") {
    return "flex-wrap";
  }
  if (wrap === "wrap-reverse") {
    return "flex-wrap-reverse";
  }
  return "";
}

export function usesTextWrap(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (
    styles?.some(
      (rule) => rule.property === "textWrap" && String(rule.value) === "wrap",
    ) ?? false
  );
}

/** Default single-line ellipsis; use `textWrap: wrap` for multi-line content. */
export function textWrapClassFromStyles(
  styles: readonly StyleRule[] | undefined,
): string {
  const rule = styles?.find((entry) => entry.property === "textWrap");
  if (!rule) {
    return "truncate";
  }

  const raw = String(rule.value);
  if (raw === "wrap") {
    return "min-w-0 max-w-full break-words whitespace-normal";
  }

  return "truncate";
}

export function rowPrefersContentWidth(
  styles: readonly StyleRule[] | undefined,
): boolean {
  const flex = parseFlexLayoutFromStyles(styles);
  const hasFlexZero =
    styles?.some(
      (rule) => rule.property === "flex" && String(rule.value) === "0",
    ) ?? false;
  const hasAlignSelfStartEnd =
    flex.selfClassName.includes("self-start") ||
    flex.selfClassName.includes("self-end");

  return hasFlexZero || hasAlignSelfStartEnd;
}

/** Text, user, and image rows hug content unless they explicitly use flex: 1. */
export function prefersInlineContentWidth(component: {
  readonly kind: string;
  readonly styles?: readonly StyleRule[];
}): boolean {
  if (
    component.kind !== "text" &&
    component.kind !== "user" &&
    component.kind !== "image"
  ) {
    return false;
  }

  return !(
    component.styles?.some(
      (rule) => rule.property === "flex" && String(rule.value) === "1",
    ) ?? false
  );
}

export function inlineContentRowClassName(
  component: {
    readonly kind: string;
    readonly styles?: readonly StyleRule[];
  },
  parentIsFlexWrapRow = false,
): string {
  if (!prefersInlineContentWidth(component)) {
    return "";
  }

  if (parentIsFlexWrapRow) {
    return "max-w-full shrink-0";
  }

  return "w-fit max-w-full shrink-0";
}

export function flexWrapRowItemClassName(
  parentStackDirection: "column" | "row",
  parentStyles: readonly StyleRule[] | undefined,
  row: {
    readonly type: string;
    readonly component?: { readonly kind: string };
  },
): string {
  if (parentStackDirection !== "row" || !usesFlexWrapLayout(parentStyles)) {
    return "";
  }

  if (row.type !== "component") {
    return "";
  }

  if (row.component?.kind === "image") {
    return "min-w-0 max-w-full shrink-0 grow-0 basis-auto";
  }

  if (row.component?.kind === "container") {
    return "min-w-0 max-w-full flex-[1_1_0] basis-0";
  }

  return "";
}

export function isFlexWrapRowStack(
  stackDirection: "column" | "row",
  styles: readonly StyleRule[] | undefined,
): boolean {
  return stackDirection === "row" && usesFlexWrapLayout(styles);
}

/** Width class for layout stacks; avoids forcing full width when children should hug content. */
export function stackShellWidthClassName(
  styles: readonly StyleRule[] | undefined,
  stackDirection: "column" | "row",
): string {
  const { align, justify, wrap } = parseFlexLayoutFromStyles(styles);

  if (
    stackDirection === "row" &&
    (wrap === "wrap" || wrap === "wrap-reverse")
  ) {
    return "w-full max-w-full min-w-0";
  }

  if (stackDirection === "column" && align === "start") {
    return "w-fit max-w-full";
  }

  if (stackDirection === "row" && justify === "start") {
    return "w-fit max-w-full";
  }

  return "w-full";
}

/** Flex stack shell classes for layout rows/columns. */
export function stackShellLayoutClasses(
  styles: readonly StyleRule[] | undefined,
  stackDirection: "column" | "row",
): string {
  const widthClass = stackShellWidthClassName(styles, stackDirection);
  const minWidthClass =
    widthClass.includes("w-fit") && !widthClass.includes("max-w-full")
      ? "min-w-max"
      : "min-w-0";

  return ["flex", minWidthClass, widthClass].join(" ");
}

/** Flex self-alignment and content width for container row wrappers. */
export function containerRowWrapperClassName(
  styles: readonly StyleRule[] | undefined,
  stackDirection: "column" | "row" = "column",
): string {
  const flex = parseFlexLayoutFromStyles(styles);
  const parts: string[] = [];

  if (flex.selfClassName) {
    parts.push(flex.selfClassName);
  }

  if (rowPrefersContentWidth(styles)) {
    if (stackDirection === "row" && usesFlexWrapLayout(styles)) {
      parts.push("w-full", "max-w-full", "min-w-0");
    } else {
      parts.push("w-fit", "max-w-full", "min-w-0", "shrink-0");
    }
  }

  return parts.join(" ");
}

export function componentSlotWrapperClassName(
  styles: readonly StyleRule[] | undefined,
): string {
  const flex = parseFlexLayoutFromStyles(styles);
  const wrapLayout = usesTextWrap(styles)
    ? "min-w-0 w-full shrink max-w-full"
    : "";
  const contentWidth =
    rowPrefersContentWidth(styles) &&
    !flex.slotFlexClassName.split(/\s+/).includes("w-full")
      ? "w-fit max-w-full min-w-0 shrink-0"
      : "";

  return [flex.selfClassName, flex.slotFlexClassName, wrapLayout, contentWidth]
    .filter(Boolean)
    .join(" ");
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

/** Inline text styles for card field values (custom colors + font size). */
export function textInlineStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
): TextInlineStyle {
  const style: TextInlineStyle = {};
  const fontSizePx = fontSizePxFromStyles(styles);
  if (fontSizePx !== undefined) {
    style.fontSize = `${fontSizePx}px`;
  }

  const colorRule = styles?.find((rule) => rule.property === "color");
  if (colorRule && isCustomColorRule(colorRule)) {
    style.color = String(colorRule.value).trim();
  }

  return style;
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

function applyCustomColorRules(
  styles: readonly StyleRule[] | undefined,
  style: LayoutInlineStyle,
): void {
  for (const rule of styles ?? []) {
    if (!isCustomColorRule(rule)) {
      continue;
    }

    const value = String(rule.value).trim();
    switch (rule.property) {
      case "backgroundColor":
        style.backgroundColor = value;
        break;
      case "color":
        style.color = value;
        break;
      case "borderColor":
        style.borderColor = value;
        break;
      default:
        break;
    }
  }
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

    const px = isMarginStyleProperty(rule.property)
      ? parseMarginPx(String(rule.value))
      : parseNonNegativeSpacingPx(String(rule.value));
    if (px === undefined) {
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
    if (px !== undefined) {
      switch (rule.property) {
        case "borderRadius":
          style.borderRadius = `${px}px`;
          break;
        case "borderTopLeftRadius":
          style.borderTopLeftRadius = `${px}px`;
          break;
        case "borderTopRightRadius":
          style.borderTopRightRadius = `${px}px`;
          break;
        case "borderBottomLeftRadius":
          style.borderBottomLeftRadius = `${px}px`;
          break;
        case "borderBottomRightRadius":
          style.borderBottomRightRadius = `${px}px`;
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

    if (rule.property === "borderStyle") {
      const raw = String(rule.value);
      if (
        raw === "solid" ||
        raw === "dashed" ||
        raw === "dotted" ||
        raw === "none"
      ) {
        style.borderStyle = raw;
      }
    }
  }

  applyCustomColorRules(styles, style);

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
    className: [
      split.containerClassName,
      textWrapClassFromStyles(styles),
      split.textClassName,
    ]
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
      textWrapClassFromStyles(styles),
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
  const text = classesFromRules(
    styles,
    (rule) =>
      TEXT_STYLE_PROPERTIES.has(rule.property) && !isCustomColorRule(rule),
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

export function columnFlexBasisStyle(percent: number): {
  readonly flex: string;
  readonly minWidth: string;
} {
  return {
    flex: `1 1 ${percent}%`,
    minWidth: `min(${percent}%, 100%)`,
  };
}
