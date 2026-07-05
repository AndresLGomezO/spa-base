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

export interface StyleRule {
  readonly property: StylePropertyKey;
  readonly value: string | ThemeToken | ShadowToken;
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
