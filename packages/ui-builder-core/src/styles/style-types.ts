export type ThemeToken =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "background"
  | "foreground"
  | "transparent";

export type ShadowToken = "none" | "card";

/** Viewport tokens shared with responsive grid / display ranges. */
export type StyleBreakpoint = "base" | "sm" | "md" | "lg" | "xl";

export type StyleRuleValue = string | ThemeToken | ShadowToken;

export type StylePropertyKey =
  | "marginTop"
  | "marginBottom"
  | "marginLeft"
  | "marginRight"
  | "paddingTop"
  | "paddingBottom"
  | "paddingLeft"
  | "paddingRight"
  | "padding"
  | "gap"
  | "backgroundColor"
  | "color"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "fontStyle"
  | "textDecoration"
  | "textAlign"
  | "textWrap"
  | "letterSpacing"
  | "alignItems"
  | "justifyContent"
  | "alignSelf"
  | "flex"
  | "width"
  | "minWidth"
  | "maxWidth"
  | "height"
  | "minHeight"
  | "maxHeight"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "position"
  | "zIndex"
  | "pointerEvents"
  | "opacity"
  | "backdropFilter"
  | "borderRadius"
  | "borderTopLeftRadius"
  | "borderTopRightRadius"
  | "borderBottomLeftRadius"
  | "borderBottomRightRadius"
  | "borderWidth"
  | "borderColor"
  | "borderStyle"
  | "boxShadow"
  | "flexWrap"
  | "overflowX"
  | "overflowY"
  | "gridColumns"
  | "gridColumnsSm"
  | "gridColumnsMd"
  | "gridColumnsLg"
  | "gridColumnsXl"
  | "gridAutoFitMinWidth"
  | "gridResponsiveMode"
  | "gridColumn"
  | "gridRow";

/**
 * Declarative style binding.
 * `value` is the global fallback; `valuesByBreakpoint` through-overrides apply
 * from mobile (`base`) through the named breakpoint (see responsive-style-rules).
 */
export interface StyleRule {
  readonly property: StylePropertyKey;
  readonly value?: StyleRuleValue;
  readonly valuesByBreakpoint?: Partial<
    Record<StyleBreakpoint, StyleRuleValue>
  >;
}

export const STYLE_PROPERTY_OPTIONS: readonly StylePropertyKey[] = [
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "padding",
  "gap",
  "backgroundColor",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "textAlign",
  "textWrap",
  "letterSpacing",
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "position",
  "zIndex",
  "pointerEvents",
  "opacity",
  "backdropFilter",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "boxShadow",
  "flexWrap",
  "overflowX",
  "overflowY",
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
  "gridAutoFitMinWidth",
  "gridResponsiveMode",
  "gridColumn",
  "gridRow",
] as const;
