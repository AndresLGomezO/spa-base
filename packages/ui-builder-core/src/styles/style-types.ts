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
  | "fontWeight"
  | "fontStyle"
  | "textDecoration"
  | "textAlign"
  | "alignItems"
  | "justifyContent"
  | "alignSelf"
  | "flex"
  | "minWidth"
  | "maxWidth"
  | "borderRadius"
  | "borderWidth"
  | "borderColor"
  | "overflowX"
  | "overflowY";

export interface StyleRule {
  readonly property: StylePropertyKey;
  readonly value: string | ThemeToken;
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
  "fontWeight",
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "minWidth",
  "maxWidth",
  "borderRadius",
  "borderWidth",
  "borderColor",
  "overflowX",
  "overflowY",
] as const;
