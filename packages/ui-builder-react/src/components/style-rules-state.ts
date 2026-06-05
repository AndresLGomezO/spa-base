import {
  STYLE_PROPERTY_OPTIONS,
  isThemeTokenValue,
  type StylePropertyKey,
  type StyleRule,
  type ThemeToken,
} from "@repo/ui-builder-core";

export const THEME_TOKEN_OPTIONS: readonly ThemeToken[] = [
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "background",
  "foreground",
  "transparent",
] as const;

export const TEXT_COLOR_TOKEN_OPTIONS = [
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export function upsertStyleRule(
  styles: readonly StyleRule[],
  index: number,
  patch: Partial<StyleRule>,
): StyleRule[] {
  const next = [...styles];
  const current = next[index];
  if (!current) {
    return next;
  }

  const updated: StyleRule =
    patch.property && patch.property !== current.property
      ? {
          ...current,
          ...patch,
          property: patch.property,
          value: defaultValueForProperty(patch.property),
        }
      : { ...current, ...patch };

  next[index] = updated;

  return next.filter(
    (rule, ruleIndex) =>
      ruleIndex === index || rule.property !== updated.property,
  );
}

export function addStyleRule(styles: readonly StyleRule[]): StyleRule[] {
  const used = new Set(styles.map((rule) => rule.property));
  const nextProperty =
    STYLE_PROPERTY_OPTIONS.find((property) => !used.has(property)) ??
    STYLE_PROPERTY_OPTIONS[0]!;

  return [
    ...styles,
    { property: nextProperty, value: defaultValueForProperty(nextProperty) },
  ];
}

export function removeStyleRule(
  styles: readonly StyleRule[],
  index: number,
): StyleRule[] {
  return styles.filter((_, ruleIndex) => ruleIndex !== index);
}

export function defaultValueForProperty(
  property: StylePropertyKey,
): string | ThemeToken {
  if (
    property === "backgroundColor" ||
    property === "color" ||
    property === "borderColor"
  ) {
    return "default";
  }
  if (property === "fontWeight") {
    return "bold";
  }
  if (property === "fontStyle") {
    return "italic";
  }
  if (property === "textDecoration") {
    return "underline";
  }
  if (property === "textAlign") {
    return "left";
  }
  if (property === "alignItems" || property === "alignSelf") {
    return "start";
  }
  if (property === "justifyContent") {
    return "start";
  }
  if (property === "overflowX" || property === "overflowY") {
    return "visible";
  }
  if (property === "flexWrap") {
    return "wrap";
  }
  if (property === "borderStyle") {
    return "solid";
  }
  if (
    property === "fontSize" ||
    property === "borderWidth" ||
    property.startsWith("margin") ||
    property.startsWith("padding") ||
    property === "gap" ||
    property === "minWidth" ||
    property === "maxWidth" ||
    property === "borderRadius"
  ) {
    return numericStyleInputMin(property) === 1 ? "1" : "0";
  }
  if (property === "flex") {
    return "1";
  }
  return "default";
}

export function isTokenStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "backgroundColor" ||
    property === "color" ||
    property === "borderColor"
  );
}

export function isColorStyleProperty(property: StylePropertyKey): boolean {
  return isTokenStyleProperty(property);
}

export function isThemeTokenStyleValue(value: string): boolean {
  return isThemeTokenValue(value);
}

export function isNumericStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "fontSize" ||
    property.startsWith("margin") ||
    property.startsWith("padding") ||
    property === "gap" ||
    property === "minWidth" ||
    property === "maxWidth" ||
    property === "borderRadius" ||
    property === "borderWidth"
  );
}

/** Minimum allowed value for numeric style inputs (pixels). */
export function numericStyleInputMin(property: StylePropertyKey): number {
  if (property === "borderWidth" || property === "fontSize") {
    return 1;
  }
  return 0;
}

export function coerceNumericStyleValue(
  property: StylePropertyKey,
  raw: string,
): string {
  const min = numericStyleInputMin(property);
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return String(min);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return String(min);
  }

  return String(Math.max(min, parsed));
}

export function isEnumStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "fontWeight" ||
    property === "fontStyle" ||
    property === "textDecoration" ||
    property === "textAlign" ||
    property === "alignItems" ||
    property === "justifyContent" ||
    property === "alignSelf" ||
    property === "flex" ||
    property === "flexWrap" ||
    property === "borderStyle" ||
    property === "overflowX" ||
    property === "overflowY"
  );
}

export function enumOptionsForProperty(
  property: StylePropertyKey,
): readonly { readonly value: string; readonly label: string }[] {
  switch (property) {
    case "fontWeight":
      return [
        { value: "bold", label: "Bold" },
        { value: "thin", label: "Thin" },
        { value: "normal", label: "Normal" },
      ];
    case "fontStyle":
      return [{ value: "italic", label: "Italic" }];
    case "textDecoration":
      return [{ value: "underline", label: "Underline" }];
    case "textAlign":
      return [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ];
    case "alignItems":
    case "alignSelf":
      return [
        { value: "start", label: "Start" },
        { value: "center", label: "Center" },
        { value: "end", label: "End" },
        { value: "stretch", label: "Stretch" },
      ];
    case "justifyContent":
      return [
        { value: "start", label: "Start" },
        { value: "center", label: "Center" },
        { value: "end", label: "End" },
        { value: "between", label: "Between" },
      ];
    case "flex":
      return [
        { value: "1", label: "1" },
        { value: "0", label: "0" },
        { value: "auto", label: "Auto" },
      ];
    case "flexWrap":
      return [
        { value: "nowrap", label: "No wrap" },
        { value: "wrap", label: "Wrap" },
        { value: "wrap-reverse", label: "Wrap reverse" },
      ];
    case "borderStyle":
      return [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
        { value: "none", label: "None" },
      ];
    case "overflowX":
    case "overflowY":
      return [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "scroll", label: "Scroll" },
        { value: "auto", label: "Auto" },
      ];
    default:
      return [];
  }
}
