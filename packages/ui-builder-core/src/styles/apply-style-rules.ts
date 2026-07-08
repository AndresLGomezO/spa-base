import type {
  StyleRule,
  StylePropertyKey,
  StyleRuleValue,
  ThemeToken,
} from "./style-types.js";
import {
  collapseStyleRulesAtBreakpoint,
  isResponsiveStylePropertyExcluded,
  mediaMinWidthForBreakpoint,
  resolveStyleValuesAcrossBreakpoints,
  styleRuleHasBreakpointOverrides,
  stylesHaveBreakpointOverrides,
  type StyleBreakpoint,
} from "./responsive-style-rules.js";
import { RESPONSIVE_BREAKPOINT_ORDER } from "../layout/responsive-grid.js";
import {
  isCssBackgroundFillValue,
  isCssColorValue,
  isCssGradientBackgroundValue,
  isThemeTokenValue,
} from "./color-values.js";
import {
  isCssBoxShadowValue,
  isCssBackdropFilterValue,
  isCssFontFamilyValue,
  isCssLengthTokenValue,
  resolveBoxLengthStyleValue,
  resolveLengthStyleValue,
  resolveMarginStyleValue,
} from "./css-values.js";
import { isShadowTokenValue, shadowTokenClass } from "./shadow-token-values.js";
import {
  isMarginStyleProperty,
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
  width?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  position?: "static" | "relative" | "absolute";
  zIndex?: string;
  pointerEvents?: "auto" | "none";
  opacity?: string;
  backdropFilter?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  backgroundColor?: string;
  background?: string;
  color?: string;
  boxShadow?: string;
  fontFamily?: string;
  fontSize?: string;
  gap?: string;
  flex?: string;
}

export interface TextInlineStyle {
  fontSize?: string;
  color?: string;
  fontFamily?: string;
  letterSpacing?: string;
  opacity?: string;
}

const TEXT_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "color",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
  "letterSpacing",
  "opacity",
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
  "width",
  "height",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "borderWidth",
  "fontSize",
  "fontFamily",
  "zIndex",
  "opacity",
  "backdropFilter",
  "position",
  "pointerEvents",
]);

export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between";
export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";

function isThemeToken(value: string): value is ThemeToken {
  return isThemeTokenValue(value);
}

/**
 * Production path: properties with `valuesByBreakpoint` must not become inline
 * styles or Layout props (those beat `@media`). Preview passes `atBreakpoint`
 * and collapses instead.
 */
export function shouldDeferPropertyToScopedCss(
  rule: StyleRule,
  atBreakpoint?: StyleBreakpoint,
): boolean {
  return (
    atBreakpoint === undefined &&
    !isResponsiveStylePropertyExcluded(rule.property) &&
    styleRuleHasBreakpointOverrides(rule)
  );
}

/** Collapse at preview BP, or strip deferred responsive rules for production flat reads. */
export function filterStyleRulesForFlatApplication(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): readonly StyleRule[] {
  if (atBreakpoint !== undefined) {
    return collapseStyleRulesAtBreakpoint(styles, atBreakpoint);
  }

  return (styles ?? []).filter((rule) => !shouldDeferPropertyToScopedCss(rule));
}

function ruleToClass(rule: StyleRule): string | undefined {
  if (rule.value === undefined) {
    return undefined;
  }
  return ruleToClassForValue(rule.property, rule.value);
}

/** Maps a flat property/value to a Tailwind utility when possible. */
export function ruleToClassForValue(
  property: StylePropertyKey,
  value: StyleRuleValue,
): string | undefined {
  const raw = String(value);
  const rule = { property, value } satisfies StyleRule;

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

  if (property === "boxShadow" && isShadowTokenValue(raw)) {
    return shadowTokenClass(raw);
  }

  if (property === "boxShadow" && isCustomBoxShadowRule(rule)) {
    return undefined;
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
    if (isCssLengthTokenValue(raw)) {
      return undefined;
    }
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
  if (rule.value === undefined) {
    return false;
  }
  if (!COLOR_STYLE_PROPERTIES.has(rule.property)) {
    return false;
  }

  const value = String(rule.value);
  if (rule.property === "backgroundColor") {
    return isCssBackgroundFillValue(value);
  }
  return isCssColorValue(value);
}

function isCustomBoxShadowRule(rule: StyleRule): boolean {
  if (rule.value === undefined) {
    return false;
  }
  return (
    rule.property === "boxShadow" &&
    !isShadowTokenValue(String(rule.value)) &&
    isCssBoxShadowValue(String(rule.value))
  );
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

export type FlexStackDirection = "column" | "row";

function readAlignSelfValue(
  styles: readonly StyleRule[] | undefined,
): FlexAlign | undefined {
  const rule = styles?.find((entry) => entry.property === "alignSelf");
  if (!rule || rule.value === undefined) {
    return undefined;
  }

  return parseFlexAlign(String(rule.value));
}

/**
 * Maps `alignSelf` onto a slot wrapper relative to the parent stack direction.
 * In column stacks, `end`/`center` use main-axis auto margins so inline rows
 * (image, text, KPI) can pin to the bottom; in row stacks, `self-*` aligns on
 * the cross axis (vertical).
 */
export function slotSelfAlignClassName(
  styles: readonly StyleRule[] | undefined,
  parentStackDirection: FlexStackDirection,
): string {
  const alignSelf = readAlignSelfValue(styles);
  if (!alignSelf) {
    return "";
  }

  if (parentStackDirection === "column") {
    if (alignSelf === "end") {
      return "mt-auto";
    }
    if (alignSelf === "center") {
      return "my-auto";
    }
    if (alignSelf === "stretch") {
      return "self-stretch";
    }
    return "";
  }

  if (alignSelf === "start") {
    return "self-start";
  }
  if (alignSelf === "center") {
    return "self-center";
  }
  if (alignSelf === "end") {
    return "self-end";
  }
  if (alignSelf === "stretch") {
    return "self-stretch";
  }

  return "";
}

export function parseFlexLayoutFromStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): FlexLayoutFromStyles {
  let align: FlexAlign | undefined;
  let justify: FlexJustify | undefined;
  let wrap: FlexWrap | undefined;
  const selfClasses: string[] = [];
  const slotFlexClasses: string[] = [];

  for (const rule of filterStyleRulesForFlatApplication(styles, atBreakpoint)) {
    if (rule.value === undefined) {
      continue;
    }
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
  atBreakpoint?: StyleBreakpoint,
): boolean {
  const wrap = parseFlexLayoutFromStyles(styles, atBreakpoint).wrap;
  if (wrap === "wrap" || wrap === "wrap-reverse") {
    return true;
  }

  if (atBreakpoint !== undefined) {
    return false;
  }

  const flexWrapRule = (styles ?? []).find(
    (rule) => rule.property === "flexWrap",
  );
  if (!flexWrapRule || !shouldDeferPropertyToScopedCss(flexWrapRule)) {
    return false;
  }

  const across = resolveStyleValuesAcrossBreakpoints(flexWrapRule);
  return Object.values(across).some(
    (value) => value === "wrap" || value === "wrap-reverse",
  );
}

export function flexWrapClassFromStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): string {
  const wrap = parseFlexLayoutFromStyles(styles, atBreakpoint).wrap;
  if (wrap === "wrap") {
    return "flex-wrap";
  }
  if (wrap === "wrap-reverse") {
    return "flex-wrap-reverse";
  }
  // Production: wrap overrides live in scoped cssText — don't force flat class.
  if (
    atBreakpoint === undefined &&
    (styles ?? []).some(
      (rule) =>
        rule.property === "flexWrap" && shouldDeferPropertyToScopedCss(rule),
    )
  ) {
    return "";
  }
  return "";
}

export function usesTextWrap(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): boolean {
  return (
    filterStyleRulesForFlatApplication(styles, atBreakpoint).some(
      (rule) =>
        rule.property === "textWrap" &&
        rule.value !== undefined &&
        String(rule.value) === "wrap",
    ) ?? false
  );
}

/** Default single-line ellipsis; use `textWrap: wrap` for multi-line content. */
export function textWrapClassFromStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): string {
  const rule = filterStyleRulesForFlatApplication(styles, atBreakpoint).find(
    (entry) => entry.property === "textWrap",
  );
  if (!rule || rule.value === undefined) {
    if (
      atBreakpoint === undefined &&
      (styles ?? []).some(
        (entry) =>
          entry.property === "textWrap" &&
          shouldDeferPropertyToScopedCss(entry),
      )
    ) {
      // Responsive textWrap is applied via scoped cssText only.
      return "";
    }
    return "truncate";
  }

  const raw = String(rule.value);
  if (raw === "wrap") {
    return "min-w-0 max-w-full break-words whitespace-normal";
  }

  return "truncate";
}

/**
 * Layout row/column/container shells should not default to `truncate`
 * (`overflow: hidden`), which clips child focus rings.
 */
export function textWrapClassForLayoutShell(
  styles: readonly StyleRule[] | undefined,
): string {
  if (usesTextWrap(styles)) {
    return textWrapClassFromStyles(styles);
  }

  return "";
}

/** Maps `flex` style rules onto layout row/slot wrappers (e.g. `flex: 1`). */
export function slotFlexGrowClassName(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): string {
  const flexRule = filterStyleRulesForFlatApplication(
    styles,
    atBreakpoint,
  ).find((rule) => rule.property === "flex");
  if (!flexRule) {
    return "";
  }

  const flexClass = ruleToClass(flexRule);
  if (!flexClass) {
    return "";
  }

  if (String(flexRule.value) === "0") {
    return "shrink-0 grow-0 basis-auto";
  }

  return `${flexClass} min-w-0`;
}

export function stylesIncludeFlexGrow(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): boolean {
  return filterStyleRulesForFlatApplication(styles, atBreakpoint).some(
    (rule) =>
      rule.property === "flex" &&
      rule.value !== undefined &&
      String(rule.value) === "1",
  );
}

/** In column stacks, `flex: 1` on inline rows stretches width so `textAlign` can center. */
export function inlineFlexGrowStretchClassName(
  component: {
    readonly kind: string;
    readonly styles?: readonly StyleRule[];
  },
  parentStackDirection: "column" | "row",
): string {
  if (parentStackDirection !== "column") {
    return "";
  }

  if (
    component.kind !== "text" &&
    component.kind !== "user" &&
    component.kind !== "image" &&
    component.kind !== "metric-kpi" &&
    component.kind !== "metric-derived-kpi"
  ) {
    return "";
  }

  if (!stylesIncludeFlexGrow(component.styles)) {
    return "";
  }

  return "w-full min-w-0 self-stretch";
}

/** Width class for the shell that wraps an embedded dashboard section layout. */
export function resolveDashboardSectionShellClassName(
  styles: readonly StyleRule[] | undefined,
): string {
  if (rowPrefersContentWidth(styles)) {
    return "min-w-0 w-fit max-w-full shrink-0";
  }

  if (stylesIncludeFlexGrow(styles)) {
    return "min-w-0 max-w-full shrink-0 flex-1";
  }

  return "min-w-0 max-w-full shrink-0";
}

/** True when styles declare a usable width range (`minWidth` and/or `maxWidth`). */
export function stylesHaveWidthBounds(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (
    styles?.some(
      (rule) => rule.property === "minWidth" || rule.property === "maxWidth",
    ) ?? false
  );
}

/**
 * Flex-wrap item classes for content/embeddable rows.
 * Width-bounded items grow/shrink between min/max; otherwise they hug content.
 */
export function flexWrapBoundedOrIntrinsicItemClassName(
  styles: readonly StyleRule[] | undefined,
): string {
  if (stylesIncludeFlexGrow(styles)) {
    return "min-w-0 max-w-full flex-[1_1_0] basis-0";
  }

  if (stylesHaveWidthBounds(styles)) {
    return "min-w-0 max-w-full flex-[1_1_auto] basis-auto";
  }

  return "w-fit max-w-full min-w-0 shrink-0 grow-0 basis-auto";
}

/** Width/height class for the shell that wraps an embedded metric widget layout. */
export function resolveMetricWidgetShellClassName(
  styles: readonly StyleRule[] | undefined,
): string {
  if (stylesHaveWidthBounds(styles)) {
    return "min-w-0 w-full max-w-full";
  }

  if (rowPrefersContentWidth(styles)) {
    return "min-w-0 w-fit max-w-full shrink-0";
  }

  if (stylesIncludeFlexGrow(styles)) {
    return "min-w-0 max-w-full shrink-0 flex-1";
  }

  return "min-w-0 max-w-full shrink-0";
}

/** Row shell classes for metric-widget and dashboard-section rows. */
export function resolveEmbeddableComponentRowClassName(
  component: {
    readonly kind: string;
    readonly styles?: readonly StyleRule[];
  },
  stackDirection: "column" | "row",
): string {
  if (stackDirection === "column") {
    if (stylesIncludeFlexGrow(component.styles)) {
      return "min-h-0 shrink-0 grow-0 flex-1";
    }

    if (stylesHaveWidthBounds(component.styles)) {
      return "w-full min-w-0 max-w-full shrink-0 grow-0";
    }

    if (rowPrefersContentWidth(component.styles)) {
      return "w-fit max-w-full min-w-0 shrink-0 grow-0";
    }

    return "min-h-0 max-w-full shrink-0 grow-0";
  }

  if (stylesIncludeFlexGrow(component.styles)) {
    return "min-w-0 max-w-full shrink-0 flex-1";
  }

  if (stylesHaveWidthBounds(component.styles)) {
    return "w-full min-w-0 max-w-full";
  }

  if (rowPrefersContentWidth(component.styles)) {
    return "w-fit max-w-full min-w-0 shrink-0 grow-0";
  }

  return "w-fit max-w-full min-w-0 shrink-0 grow-0";
}

export function rowPrefersContentWidth(
  styles: readonly StyleRule[] | undefined,
): boolean {
  const hasFlexZero =
    styles?.some(
      (rule) =>
        rule.property === "flex" &&
        rule.value !== undefined &&
        String(rule.value) === "0",
    ) ?? false;
  const alignSelf = readAlignSelfValue(styles);
  const hasAlignSelfStartEnd = alignSelf === "start" || alignSelf === "end";
  const widthRule = styles?.find((rule) => rule.property === "width");
  const hasWidthAuto =
    widthRule !== undefined && String(widthRule.value).trim() === "auto";

  return hasFlexZero || hasAlignSelfStartEnd || hasWidthAuto;
}

/** Text, user, and inline image rows hug content unless they explicitly use flex: 1. */
export function prefersInlineContentWidth(component: {
  readonly kind: string;
  readonly styles?: readonly StyleRule[];
  readonly displayMode?: "inline" | "overlay";
}): boolean {
  if (component.kind === "image" && component.displayMode === "overlay") {
    return false;
  }

  if (
    component.kind !== "text" &&
    component.kind !== "user" &&
    component.kind !== "image" &&
    component.kind !== "metric-kpi" &&
    component.kind !== "metric-derived-kpi"
  ) {
    return false;
  }

  return !(
    component.styles?.some(
      (rule) =>
        rule.property === "flex" &&
        rule.value !== undefined &&
        String(rule.value) === "1",
    ) ?? false
  );
}

export function inlineContentRowClassName(
  component: {
    readonly kind: string;
    readonly styles?: readonly StyleRule[];
    readonly displayMode?: "inline" | "overlay";
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
    readonly component?: {
      readonly kind: string;
      readonly styles?: readonly StyleRule[];
    };
  },
  atBreakpoint?: StyleBreakpoint,
): string {
  if (
    parentStackDirection !== "row" ||
    !usesFlexWrapLayout(parentStyles, atBreakpoint)
  ) {
    return "";
  }

  if (row.type !== "component") {
    return "";
  }

  if (row.component?.kind === "image") {
    return "min-w-0 max-w-full shrink-0 grow-0 basis-auto";
  }

  if (row.component?.kind === "container") {
    return flexWrapBoundedOrIntrinsicItemClassName(row.component.styles);
  }

  if (
    row.component?.kind === "dashboard-section" ||
    row.component?.kind === "metric-widget" ||
    row.component?.kind === "metric-kpi" ||
    row.component?.kind === "metric-derived-kpi" ||
    row.component?.kind === "query-viewer"
  ) {
    return flexWrapBoundedOrIntrinsicItemClassName(row.component.styles);
  }

  return "";
}

export function isFlexWrapRowStack(
  stackDirection: "column" | "row",
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): boolean {
  return stackDirection === "row" && usesFlexWrapLayout(styles, atBreakpoint);
}

/** Width class for layout stacks; avoids forcing full width when children should hug content. */
export function stackShellWidthClassName(
  styles: readonly StyleRule[] | undefined,
  stackDirection: "column" | "row",
  atBreakpoint?: StyleBreakpoint,
): string {
  const { align, justify, wrap } = parseFlexLayoutFromStyles(
    styles,
    atBreakpoint,
  );

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
  const minWidthClass = widthClass.includes("w-fit") ? "min-w-max" : "min-w-0";

  return ["flex", minWidthClass, widthClass].join(" ");
}

/** Column stack inside a stretched row sibling container (supports justify-content). */
export function stretchColumnStackShellClassName(): string {
  return "flex min-h-0 min-w-0 h-full w-full flex-1 flex-col";
}

/** Container shell when it sits beside siblings in a horizontal stack. */
export function rowSiblingContainerShellClassName(): string {
  return "flex min-h-0 self-stretch flex-col";
}

/** Flex self-alignment and content width for container row wrappers. */
export function containerRowWrapperClassName(
  styles: readonly StyleRule[] | undefined,
  stackDirection: FlexStackDirection = "column",
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
      parts.push("w-fit", "max-w-full", "min-w-max", "shrink-0");
    }
  }

  return parts.join(" ");
}

export function componentSlotWrapperClassName(
  styles: readonly StyleRule[] | undefined,
  parentStackDirection: FlexStackDirection = "row",
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

  return [
    slotSelfAlignClassName(styles, parentStackDirection),
    flex.slotFlexClassName,
    slotFlexGrowClassName(styles),
    wrapLayout,
    contentWidth,
  ]
    .filter(Boolean)
    .join(" ");
}

function fontSizeRuleFlatValue(
  styles: readonly StyleRule[] | undefined,
): string | undefined {
  const fontSizeRule = styles?.find(
    (rule) => rule.property === FONT_SIZE_STYLE_PROPERTY,
  );
  if (!fontSizeRule || fontSizeRule.value === undefined) {
    return undefined;
  }
  return String(fontSizeRule.value);
}

/** Pixel font size for card field values; undefined when no valid `fontSize` rule. */
export function fontSizePxFromStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): number | undefined {
  const raw = fontSizeRuleFlatValue(
    filterStyleRulesForFlatApplication(styles, atBreakpoint),
  );
  if (raw === undefined) {
    return undefined;
  }

  if (isCssLengthTokenValue(raw)) {
    return undefined;
  }

  const px = Number.parseInt(raw, 10);
  return Number.isFinite(px) && px > 0 ? px : undefined;
}

function resolveFontSizeStyleValue(
  styles: readonly StyleRule[] | undefined,
): string | undefined {
  const raw = fontSizeRuleFlatValue(styles);
  if (raw === undefined) {
    return undefined;
  }

  if (isCssLengthTokenValue(raw)) {
    return raw;
  }

  const px = Number.parseInt(raw, 10);
  return Number.isFinite(px) && px > 0 ? `${px}px` : undefined;
}

/** Inline text styles for card field values (custom colors + font size). */
export function textInlineStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): TextInlineStyle {
  const flat = filterStyleRulesForFlatApplication(styles, atBreakpoint);
  const style: TextInlineStyle = {};
  const fontSize = resolveFontSizeStyleValue(flat);
  if (fontSize !== undefined) {
    style.fontSize = fontSize;
  }

  const colorRule = flat.find((rule) => rule.property === "color");
  if (
    colorRule &&
    colorRule.value !== undefined &&
    isCustomColorRule(colorRule)
  ) {
    style.color = String(colorRule.value).trim();
  }

  const fontFamilyRule = flat.find((rule) => rule.property === "fontFamily");
  if (
    fontFamilyRule &&
    fontFamilyRule.value !== undefined &&
    isCssFontFamilyValue(String(fontFamilyRule.value))
  ) {
    style.fontFamily = String(fontFamilyRule.value).trim();
  }

  const letterSpacingRule = flat.find(
    (rule) => rule.property === "letterSpacing",
  );
  if (letterSpacingRule && letterSpacingRule.value !== undefined) {
    const resolved = resolveBoxLengthStyleValue(
      String(letterSpacingRule.value),
    );
    if (resolved !== undefined) {
      style.letterSpacing = resolved;
    }
  }

  const opacityRule = flat.find((rule) => rule.property === "opacity");
  if (opacityRule && opacityRule.value !== undefined) {
    const resolved = parseOpacityStyleValue(String(opacityRule.value));
    if (resolved !== undefined) {
      style.opacity = resolved;
    }
  }

  return style;
}

function gapRuleFromStyles(
  styles: readonly StyleRule[] | undefined,
): StyleRule | undefined {
  return styles?.find((rule) => rule.property === "gap");
}

/** CSS gap value from style rules (theme token or px). */
export function gapStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): string | undefined {
  const flat = filterStyleRulesForFlatApplication(styles, atBreakpoint);
  const gapRule = gapRuleFromStyles(flat);
  if (!gapRule || gapRule.value === undefined) {
    return undefined;
  }

  return resolveLengthStyleValue(String(gapRule.value));
}

/** Resolves grid gap CSS from explicit `gap` prop, then legacy style rules. */
export function resolveGridGapCSSValue(
  gap: string | undefined,
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): string | undefined {
  const trimmedGap = gap?.trim();
  if (trimmedGap) {
    return resolveLengthStyleValue(trimmedGap) ?? trimmedGap;
  }

  return gapStyleFromStyleRules(styles, atBreakpoint);
}

/** Pixel gap for `LayoutGrid` / `LayoutStack`; defaults to 0 when no `gap` style rule. */
export function gapPxFromStyles(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): number {
  const flat = filterStyleRulesForFlatApplication(styles, atBreakpoint);
  const gapRule = gapRuleFromStyles(flat);
  if (!gapRule || gapRule.value === undefined) {
    return 0;
  }

  const px = Number.parseInt(String(gapRule.value), 10);
  return Number.isFinite(px) && px >= 0 ? px : 0;
}

/**
 * Layout stack/grid gap: snapped inline value in preview, or scoped CSS in
 * production when `valuesByBreakpoint` is set. `gap: null` means omit inline px
 * so media-query CSS can control spacing.
 */
export interface GapLayoutProps {
  /** Pixel gap for LayoutGrid/Stack; `null` omits inline gap (CSS-driven). */
  readonly gap: number | null;
  readonly style?: LayoutInlineStyle;
  readonly className?: string;
  readonly cssText?: string;
}

/** @deprecated Prefer {@link resolveLayoutSpacingProps}. */
export type LayoutSpacingProps = GapLayoutProps;

function deferredLayoutContainerRules(
  styles: readonly StyleRule[] | undefined,
): StyleRule[] {
  return (styles ?? []).filter(
    (rule) =>
      LAYOUT_CONTAINER_PROPERTIES.has(rule.property) &&
      shouldDeferPropertyToScopedCss(rule),
  );
}

/**
 * Spacing props for LayoutGrid/Stack. When gap (or other deferred layout props)
 * need scoped CSS, returns `gap: null` + cssText instead of locking inline px.
 */
export function resolveLayoutSpacingProps(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): GapLayoutProps {
  if (atBreakpoint !== undefined) {
    const flat = collapseStyleRulesAtBreakpoint(styles, atBreakpoint);
    const gapCss = gapStyleFromStyleRules(flat, atBreakpoint);
    if (gapCss && isCssLengthTokenValue(gapCss)) {
      return { gap: null, style: { gap: gapCss } };
    }
    return { gap: gapPxFromStyles(flat, atBreakpoint) };
  }

  const deferredLayoutRules = deferredLayoutContainerRules(styles);
  if (deferredLayoutRules.length > 0) {
    const resolved = resolveStyleRules(deferredLayoutRules);
    const gapRule = gapRuleFromStyles(styles);
    const gapDeferred =
      gapRule !== undefined && shouldDeferPropertyToScopedCss(gapRule);
    const gapCss = gapDeferred ? undefined : gapStyleFromStyleRules(styles);

    return {
      gap: gapDeferred ? null : gapPxFromStyles(styles),
      style:
        gapCss && isCssLengthTokenValue(gapCss) ? { gap: gapCss } : undefined,
      className: resolved.styleScopeClassName,
      cssText: resolved.cssText,
    };
  }

  const gapCss = gapStyleFromStyleRules(styles);
  if (gapCss && isCssLengthTokenValue(gapCss)) {
    return { gap: null, style: { gap: gapCss } };
  }

  return { gap: gapPxFromStyles(styles) };
}

export function resolveGapLayoutProps(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): GapLayoutProps {
  return resolveLayoutSpacingProps(styles, atBreakpoint);
}

function applyCustomVisualRules(
  styles: readonly StyleRule[] | undefined,
  style: LayoutInlineStyle,
): void {
  for (const rule of styles ?? []) {
    if (rule.value === undefined || shouldDeferPropertyToScopedCss(rule)) {
      continue;
    }
    if (isCustomColorRule(rule)) {
      const value = String(rule.value).trim();
      switch (rule.property) {
        case "backgroundColor":
          if (isCssGradientBackgroundValue(value)) {
            style.background = value;
          } else {
            style.backgroundColor = value;
          }
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
      continue;
    }

    if (isCustomBoxShadowRule(rule)) {
      style.boxShadow = String(rule.value).trim();
      continue;
    }

    if (
      rule.property === "fontFamily" &&
      isCssFontFamilyValue(String(rule.value))
    ) {
      style.fontFamily = String(rule.value).trim();
    }
  }
}

/** Inline margin/padding from style rules. */
export function spacingStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): SpacingInlineStyle {
  const style: SpacingInlineStyle = {};

  for (const rule of filterStyleRulesForFlatApplication(styles, atBreakpoint)) {
    if (
      !SPACING_STYLE_PROPERTIES.has(rule.property) ||
      rule.value === undefined
    ) {
      continue;
    }

    const raw = String(rule.value);
    const resolved = isMarginStyleProperty(rule.property)
      ? resolveMarginStyleValue(raw)
      : isCssLengthTokenValue(raw)
        ? raw
        : (() => {
            const px = parseNonNegativeSpacingPx(raw);
            return px !== undefined ? `${px}px` : undefined;
          })();
    if (resolved === undefined) {
      continue;
    }

    const value = resolved;
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
  const raw = String(value);
  if (isCssLengthTokenValue(raw)) {
    return undefined;
  }

  const px = Number.parseInt(raw, 10);
  return Number.isFinite(px) && px >= 0 ? px : undefined;
}

function applyLengthStyleRule(
  style: LayoutInlineStyle,
  property: StylePropertyKey,
  raw: string,
): void {
  const resolved = resolveBoxLengthStyleValue(raw);
  if (resolved === undefined) {
    return;
  }

  switch (property) {
    case "borderRadius":
      style.borderRadius = resolved;
      break;
    case "borderTopLeftRadius":
      style.borderTopLeftRadius = resolved;
      break;
    case "borderTopRightRadius":
      style.borderTopRightRadius = resolved;
      break;
    case "borderBottomLeftRadius":
      style.borderBottomLeftRadius = resolved;
      break;
    case "borderBottomRightRadius":
      style.borderBottomRightRadius = resolved;
      break;
    case "width":
      style.width = resolved;
      break;
    case "minWidth":
      style.minWidth = resolved;
      break;
    case "maxWidth":
      style.maxWidth = resolved;
      break;
    case "height":
      style.height = resolved;
      break;
    case "minHeight":
      style.minHeight = resolved;
      break;
    case "maxHeight":
      style.maxHeight = resolved;
      break;
    case "top":
      style.top = resolved;
      break;
    case "right":
      style.right = resolved;
      break;
    case "bottom":
      style.bottom = resolved;
      break;
    case "left":
      style.left = resolved;
      break;
    case "gap":
      style.gap = resolved;
      break;
    case "fontSize":
      style.fontSize = resolved;
      break;
    default:
      break;
  }
}

function parseOpacityStyleValue(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.includes(".")) {
    const decimal = Number.parseFloat(trimmed);
    if (Number.isFinite(decimal) && decimal >= 0 && decimal <= 1) {
      return String(decimal);
    }
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const clamped = Math.min(100, Math.max(0, parsed));
  return String(clamped / 100);
}

function parseZIndexStyleValue(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return String(parsed);
}

function applyBoxLayoutStyleRules(
  styles: readonly StyleRule[] | undefined,
  style: LayoutInlineStyle,
): void {
  for (const rule of styles ?? []) {
    if (rule.value === undefined || shouldDeferPropertyToScopedCss(rule)) {
      continue;
    }
    const raw = String(rule.value);

    if (
      rule.property === "width" ||
      rule.property === "minWidth" ||
      rule.property === "maxWidth" ||
      rule.property === "height" ||
      rule.property === "minHeight" ||
      rule.property === "maxHeight" ||
      rule.property === "top" ||
      rule.property === "right" ||
      rule.property === "bottom" ||
      rule.property === "left"
    ) {
      applyLengthStyleRule(style, rule.property, raw);
      continue;
    }

    if (rule.property === "position") {
      if (raw === "static" || raw === "relative" || raw === "absolute") {
        style.position = raw;
      }
      continue;
    }

    if (rule.property === "pointerEvents") {
      if (raw === "auto" || raw === "none") {
        style.pointerEvents = raw;
      }
      continue;
    }

    if (rule.property === "zIndex") {
      const resolved = parseZIndexStyleValue(raw);
      if (resolved !== undefined) {
        style.zIndex = resolved;
      }
      continue;
    }

    if (rule.property === "opacity") {
      const resolved = parseOpacityStyleValue(raw);
      if (resolved !== undefined) {
        style.opacity = resolved;
      }
      continue;
    }

    if (rule.property === "backdropFilter" && isCssBackdropFilterValue(raw)) {
      style.backdropFilter = raw.trim();
    }
  }
}

/** Spacing plus pixel dimensions (border radius, min/max width, border width). */
export function layoutInlineStyleFromStyleRules(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): LayoutInlineStyle {
  const flat = filterStyleRulesForFlatApplication(styles, atBreakpoint);
  const style: LayoutInlineStyle = {
    ...spacingStyleFromStyleRules(flat, atBreakpoint),
  };

  for (const rule of flat) {
    const raw = rule.value === undefined ? undefined : String(rule.value);
    if (raw === undefined) {
      continue;
    }
    if (BORDER_RADIUS_STYLE_PROPERTIES.has(rule.property)) {
      applyLengthStyleRule(style, rule.property, raw);
      continue;
    }

    if (
      rule.property === "minWidth" ||
      rule.property === "maxWidth" ||
      rule.property === "gap" ||
      rule.property === "fontSize"
    ) {
      applyLengthStyleRule(style, rule.property, raw);
      continue;
    }

    applyBoxLayoutStyleRules([rule], style);

    const px = parseNonNegativePx(raw);
    if (px !== undefined && rule.property === "borderWidth") {
      if (px > 0) {
        style.borderWidth = `${px}px`;
        style.borderStyle = style.borderStyle ?? "solid";
      }
    }

    if (rule.property === "borderStyle") {
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

  applyCustomVisualRules(flat, style);

  return style;
}

export interface ResolvedStyleRules {
  readonly className: string;
  readonly style: LayoutInlineStyle;
  /** Scoped class paired with {@link cssText} for production responsive overrides. */
  readonly styleScopeClassName?: string;
  /** Mobile-first `@media` CSS for breakpoint overrides (inject next to the node). */
  readonly cssText?: string;
}

export interface ResolveStyleRulesOptions {
  readonly atBreakpoint?: StyleBreakpoint;
  readonly baseClassName?: string;
}

function hashStyleSeed(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function kebabCssProperty(camel: string): string {
  return camel.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function layoutStyleToCssDeclarations(style: LayoutInlineStyle): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === "") {
      continue;
    }
    parts.push(`${kebabCssProperty(key)}:${value}`);
  }
  return parts.join(";");
}

function cssDeclarationsForFlatValue(
  property: StylePropertyKey,
  value: StyleRuleValue,
): string | undefined {
  const flat: StyleRule = { property, value };
  const inline = layoutInlineStyleFromStyleRules([flat]);

  // fontSize: emit CSS var + font-size on the scope so nested value spans (and
  // inheriting children) follow media updates without a fixed inline px lock.
  if (property === "fontSize" && inline.fontSize !== undefined) {
    return `--ub-font-size:${inline.fontSize};font-size:var(--ub-font-size)`;
  }

  if (property === "letterSpacing") {
    const resolved = resolveBoxLengthStyleValue(String(value));
    if (resolved !== undefined) {
      return `letter-spacing:${resolved}`;
    }
  }

  const fromInline = layoutStyleToCssDeclarations(inline);
  if (fromInline.length > 0) {
    return fromInline;
  }

  const raw = String(value);
  const tokenCss = themeTokenCssDeclarations(property, raw);
  if (tokenCss) {
    return tokenCss;
  }

  switch (property) {
    case "fontWeight":
      if (raw === "bold") return "font-weight:700";
      if (raw === "thin") return "font-weight:400";
      return undefined;
    case "fontStyle":
      return raw === "italic" ? "font-style:italic" : undefined;
    case "textDecoration":
      return raw === "underline" ? "text-decoration:underline" : undefined;
    case "textAlign":
      if (raw === "left" || raw === "center" || raw === "right") {
        return `text-align:${raw}`;
      }
      return undefined;
    case "textWrap":
      if (raw === "wrap") {
        return "overflow:visible;text-overflow:clip;white-space:normal;word-break:break-word;min-width:0;max-width:100%";
      }
      if (raw === "truncate") {
        return "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      }
      return undefined;
    case "flexWrap":
      if (raw === "wrap") return "flex-wrap:wrap";
      if (raw === "wrap-reverse") return "flex-wrap:wrap-reverse";
      if (raw === "nowrap") return "flex-wrap:nowrap";
      return undefined;
    case "alignItems":
      if (raw === "start") return "align-items:flex-start";
      if (raw === "center") return "align-items:center";
      if (raw === "end") return "align-items:flex-end";
      if (raw === "stretch") return "align-items:stretch";
      return undefined;
    case "justifyContent":
      if (raw === "start") return "justify-content:flex-start";
      if (raw === "center") return "justify-content:center";
      if (raw === "end") return "justify-content:flex-end";
      if (raw === "between") return "justify-content:space-between";
      return undefined;
    case "alignSelf":
      if (raw === "start") return "align-self:flex-start";
      if (raw === "center") return "align-self:center";
      if (raw === "end") return "align-self:flex-end";
      if (raw === "stretch") return "align-self:stretch";
      return undefined;
    case "overflowX":
      return `overflow-x:${raw}`;
    case "overflowY":
      return `overflow-y:${raw}`;
    case "flex":
      return `flex:${raw}`;
    default:
      return undefined;
  }
}

/** Raw CSS for theme tokens so breakpoint swaps work under @media (no Tailwind). */
function themeTokenCssDeclarations(
  property: StylePropertyKey,
  raw: string,
): string | undefined {
  if (property === "boxShadow" && isShadowTokenValue(raw)) {
    if (raw === "none") {
      return "box-shadow:none";
    }
    if (raw === "card") {
      return "box-shadow:var(--shadow-card)";
    }
  }

  if (!isThemeToken(raw)) {
    return undefined;
  }

  switch (property) {
    case "backgroundColor":
      return themeTokenBackgroundCss(raw);
    case "color":
      return themeTokenTextCss(raw);
    case "borderColor":
      return themeTokenBorderCss(raw);
    default:
      return undefined;
  }
}

function themeTokenBackgroundCss(token: ThemeToken): string {
  switch (token) {
    case "muted":
      return "background-color:var(--color-muted)";
    case "primary":
      return "background-color:color-mix(in oklab, var(--color-primary) 10%, transparent)";
    case "success":
      return "background-color:color-mix(in oklab, var(--color-success) 10%, transparent)";
    case "warning":
      return "background-color:color-mix(in oklab, var(--color-warning) 10%, transparent)";
    case "danger":
      return "background-color:color-mix(in oklab, var(--color-destructive) 10%, transparent)";
    case "info":
      return "background-color:color-mix(in oklab, var(--color-info) 10%, transparent)";
    case "background":
      return "background-color:var(--color-background)";
    case "foreground":
      return "background-color:color-mix(in oklab, var(--color-foreground) 10%, transparent)";
    case "transparent":
      return "background-color:transparent";
    default:
      return "background-color:var(--color-muted)";
  }
}

function themeTokenTextCss(token: ThemeToken): string {
  switch (token) {
    case "muted":
      return "color:var(--color-muted-foreground)";
    case "primary":
      return "color:var(--color-primary)";
    case "success":
      return "color:var(--color-success)";
    case "warning":
      return "color:var(--color-warning)";
    case "danger":
      return "color:var(--color-destructive)";
    case "info":
      return "color:var(--color-info)";
    case "transparent":
      return "color:transparent";
    case "background":
    case "foreground":
    case "default":
    default:
      return "color:var(--color-foreground)";
  }
}

function themeTokenBorderCss(token: ThemeToken): string {
  switch (token) {
    case "muted":
      return "border-color:var(--color-muted)";
    case "primary":
      return "border-color:var(--color-primary)";
    case "success":
      return "border-color:var(--color-success)";
    case "warning":
      return "border-color:var(--color-warning)";
    case "danger":
      return "border-color:var(--color-destructive)";
    case "info":
      return "border-color:var(--color-info)";
    case "background":
      return "border-color:var(--color-background)";
    case "foreground":
      return "border-color:var(--color-foreground)";
    case "transparent":
      return "border-color:transparent";
    default:
      return "border-color:var(--color-border)";
  }
}

function unsetCssForProperty(property: StylePropertyKey): string {
  const probe = layoutInlineStyleFromStyleRules([{ property, value: "0" }]);
  const keys = Object.keys(probe);
  if (keys.length > 0) {
    return keys.map((key) => `${kebabCssProperty(key)}:unset`).join(";");
  }

  switch (property) {
    case "fontSize":
      return "--ub-font-size:unset;font-size:unset";
    case "fontWeight":
      return "font-weight:unset";
    case "fontStyle":
      return "font-style:unset";
    case "textDecoration":
      return "text-decoration:unset";
    case "textAlign":
      return "text-align:unset";
    case "textWrap":
      return "overflow:unset;text-overflow:unset;white-space:unset;word-break:unset";
    case "backgroundColor":
      return "background:unset;background-color:unset";
    case "color":
      return "color:unset";
    case "borderColor":
      return "border-color:unset";
    case "boxShadow":
      return "box-shadow:unset";
    case "flexWrap":
      return "flex-wrap:unset";
    case "alignItems":
      return "align-items:unset";
    case "justifyContent":
      return "justify-content:unset";
    case "alignSelf":
      return "align-self:unset";
    case "overflowX":
      return "overflow-x:unset";
    case "overflowY":
      return "overflow-y:unset";
    case "flex":
      return "flex:unset";
    default:
      return "";
  }
}

function resolveFlatStyleRules(
  styles: readonly StyleRule[] | undefined,
  baseClassName: string | undefined,
  mode: "component" | "rowWrapper" | "pageSlot",
): ResolvedStyleRules {
  if (mode === "pageSlot") {
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

  const split = splitStyleRuleClasses(styles, baseClassName);
  if (mode === "rowWrapper") {
    return {
      className: [
        split.containerClassName,
        textWrapClassForLayoutShell(styles),
        split.textClassName,
        slotFlexGrowClassName(styles),
      ]
        .filter(Boolean)
        .join(" "),
      style: layoutInlineStyleFromStyleRules(styles),
    };
  }

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

function emitProductionResponsiveStyleRules(
  styles: readonly StyleRule[],
  baseClassName: string | undefined,
  mode: "component" | "rowWrapper" | "pageSlot",
): ResolvedStyleRules {
  const staticRules: StyleRule[] = [];
  const responsiveRules: StyleRule[] = [];

  for (const rule of styles) {
    if (
      isResponsiveStylePropertyExcluded(rule.property) ||
      !styleRuleHasBreakpointOverrides(rule)
    ) {
      if (rule.value !== undefined) {
        staticRules.push({ property: rule.property, value: rule.value });
      } else if (isResponsiveStylePropertyExcluded(rule.property)) {
        staticRules.push(rule);
      }
      continue;
    }
    responsiveRules.push(rule);
  }

  if (responsiveRules.length === 0) {
    return resolveFlatStyleRules(staticRules, baseClassName, mode);
  }

  const baseFlat: StyleRule[] = [...staticRules];
  const baseCssDecls: string[] = [];
  const mediaBlocks: string[] = [];
  const seedParts: string[] = [];

  for (const rule of responsiveRules) {
    const across = resolveStyleValuesAcrossBreakpoints(rule);
    seedParts.push(
      `${rule.property}:${RESPONSIVE_BREAKPOINT_ORDER.map((bp) => `${bp}=${across[bp] ?? ""}`).join(",")}`,
    );

    let previous: StyleRuleValue | undefined | null = null;

    for (const bp of RESPONSIVE_BREAKPOINT_ORDER) {
      const current = across[bp];
      if (current === previous) {
        continue;
      }

      if (current === undefined) {
        if (previous !== null && previous !== undefined && bp !== "base") {
          const unset = unsetCssForProperty(rule.property);
          if (unset) {
            mediaBlocks.push(
              `@media (min-width:${mediaMinWidthForBreakpoint(bp)}px){.__SCOPE__{${unset}}}`,
            );
          }
        }
        previous = current;
        continue;
      }

      const decls = cssDeclarationsForFlatValue(rule.property, current);
      if (bp === "base") {
        if (decls) {
          // Keep responsive length/color values out of inline styles — they would
          // beat @media overrides. Base lives in the scoped stylesheet instead.
          baseCssDecls.push(decls);
        } else {
          baseFlat.push({ property: rule.property, value: current });
        }
      } else if (decls) {
        mediaBlocks.push(
          `@media (min-width:${mediaMinWidthForBreakpoint(bp)}px){.__SCOPE__{${decls}}}`,
        );
      }

      previous = current;
    }
  }

  const flatResolved = resolveFlatStyleRules(baseFlat, baseClassName, mode);
  if (baseCssDecls.length === 0 && mediaBlocks.length === 0) {
    return flatResolved;
  }

  const scopeClassName = `ub-rs-${hashStyleSeed(seedParts.join("|"))}`;
  const cssParts: string[] = [];
  if (baseCssDecls.length > 0) {
    cssParts.push(`.${scopeClassName}{${baseCssDecls.join(";")}}`);
  }
  for (const block of mediaBlocks) {
    cssParts.push(block.replaceAll(".__SCOPE__", `.${scopeClassName}`));
  }

  return {
    className: [flatResolved.className, scopeClassName]
      .filter(Boolean)
      .join(" "),
    style: flatResolved.style,
    styleScopeClassName: scopeClassName,
    cssText: cssParts.join(""),
  };
}

function resolveStyleRulesInternal(
  styles: readonly StyleRule[] | undefined,
  mode: "component" | "rowWrapper" | "pageSlot",
  options?: ResolveStyleRulesOptions | string,
): ResolvedStyleRules {
  const normalized: ResolveStyleRulesOptions =
    typeof options === "string" ? { baseClassName: options } : (options ?? {});
  const { atBreakpoint, baseClassName } = normalized;

  if (atBreakpoint !== undefined) {
    const collapsed = collapseStyleRulesAtBreakpoint(styles, atBreakpoint);
    return resolveFlatStyleRules(collapsed, baseClassName, mode);
  }

  if (!stylesHaveBreakpointOverrides(styles)) {
    return resolveFlatStyleRules(styles, baseClassName, mode);
  }

  return emitProductionResponsiveStyleRules(
    [...(styles ?? [])],
    baseClassName,
    mode,
  );
}

export function resolveStyleRules(
  styles: readonly StyleRule[] | undefined,
  baseClassNameOrOptions?: string | ResolveStyleRulesOptions,
): ResolvedStyleRules {
  return resolveStyleRulesInternal(styles, "component", baseClassNameOrOptions);
}

/** Style rules for layout shells that wrap interactive components. */
export function resolveRowWrapperStyleRules(
  styles: readonly StyleRule[] | undefined,
  baseClassNameOrOptions?: string | ResolveStyleRulesOptions,
): ResolvedStyleRules {
  return resolveStyleRulesInternal(
    styles,
    "rowWrapper",
    baseClassNameOrOptions,
  );
}

/**
 * Resolves wrapper class + inline spacing for main-page slot components
 * (`page-toolbar`, `page-metrics`, `page-list`, `page-header`).
 * Includes layout/position tokens (flex alignment, gap, min/max width) and
 * theme backgrounds, not only margin/padding.
 */
export function resolvePageSlotWrapper(
  styles: readonly StyleRule[] | undefined,
  baseClassNameOrOptions?: string | ResolveStyleRulesOptions,
): ResolvedStyleRules {
  return resolveStyleRulesInternal(styles, "pageSlot", baseClassNameOrOptions);
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
