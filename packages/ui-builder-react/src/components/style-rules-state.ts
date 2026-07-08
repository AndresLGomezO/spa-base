import {
  buildBadgeColorOptions,
  buildEffectColorOptions,
  buildEffectShadowVarOptions,
  buildPaletteColorOptions,
  buildRadiusTokenOptions,
  buildSemanticColorOptions,
  buildSidebarColorOptions,
  buildSpacingTokenOptions,
  buildTypographyFontFamilyOptions,
  buildTypographySizeOptions,
  buildWidthTokenOptions,
  SHADOW_TOKEN_OPTIONS,
  type UiBuilderStyleTokenOption,
} from "@repo/theme/tenant-overrides";
import {
  STYLE_PROPERTY_OPTIONS,
  isCssBackdropFilterValue,
  isCssBoxShadowValue,
  isCssFontFamilyValue,
  isCssLengthTokenValue,
  isMarginStyleProperty,
  isShadowTokenValue,
  isThemeTokenValue,
  NEGATIVE_MARGIN_MIN_PX,
  parseMarginPx,
  type StylePropertyKey,
  type StyleRule,
  type ThemeToken,
} from "@repo/ui-builder-core";

export type SemanticColorOption = UiBuilderStyleTokenOption;

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

export const SEMANTIC_COLOR_OPTIONS = buildSemanticColorOptions();
export const SIDEBAR_COLOR_OPTIONS = buildSidebarColorOptions();
export const BADGE_COLOR_OPTIONS = buildBadgeColorOptions();
export const PALETTE_COLOR_OPTIONS = buildPaletteColorOptions();
export const EFFECT_COLOR_OPTIONS = buildEffectColorOptions().filter((option) =>
  option.value.includes("--gradient-"),
);
export const SHADOW_SHORTCUT_OPTIONS = SHADOW_TOKEN_OPTIONS;
export const SHADOW_VAR_OPTIONS = buildEffectShadowVarOptions();
export const RADIUS_TOKEN_OPTIONS = buildRadiusTokenOptions();
export const SPACING_TOKEN_OPTIONS = buildSpacingTokenOptions();
export const TYPOGRAPHY_SIZE_OPTIONS = buildTypographySizeOptions();
export const TYPOGRAPHY_FONT_FAMILY_OPTIONS =
  buildTypographyFontFamilyOptions();
export const WIDTH_TOKEN_OPTIONS = buildWidthTokenOptions();

const SEMANTIC_COLOR_VALUES = new Set(
  [
    ...SEMANTIC_COLOR_OPTIONS,
    ...SIDEBAR_COLOR_OPTIONS,
    ...BADGE_COLOR_OPTIONS,
    ...EFFECT_COLOR_OPTIONS,
  ].map((option) => option.value),
);

const PALETTE_COLOR_VALUES = new Set(
  PALETTE_COLOR_OPTIONS.map((option) => option.value),
);

const SHADOW_THEME_VALUES = new Set([
  ...SHADOW_SHORTCUT_OPTIONS.map((option) => option.value),
  ...SHADOW_VAR_OPTIONS.map((option) => option.value),
]);

export function dimensionTokenOptionsForProperty(
  property: StylePropertyKey,
): readonly SemanticColorOption[] {
  if (
    property === "borderRadius" ||
    property === "borderTopLeftRadius" ||
    property === "borderTopRightRadius" ||
    property === "borderBottomLeftRadius" ||
    property === "borderBottomRightRadius"
  ) {
    return RADIUS_TOKEN_OPTIONS;
  }

  if (
    property.startsWith("padding") ||
    property === "padding" ||
    property.startsWith("margin") ||
    property === "gap"
  ) {
    return SPACING_TOKEN_OPTIONS;
  }

  if (property === "fontSize") {
    return TYPOGRAPHY_SIZE_OPTIONS;
  }

  if (property === "minWidth" || property === "maxWidth") {
    return WIDTH_TOKEN_OPTIONS;
  }

  if (
    property === "width" ||
    property === "height" ||
    property === "minHeight" ||
    property === "maxHeight" ||
    property === "top" ||
    property === "right" ||
    property === "bottom" ||
    property === "left" ||
    property === "letterSpacing"
  ) {
    return [...WIDTH_TOKEN_OPTIONS, ...SPACING_TOKEN_OPTIONS];
  }

  return [];
}

export function isSemanticCssVarStyleValue(value: string): boolean {
  return SEMANTIC_COLOR_VALUES.has(value.trim());
}

export function isPaletteCssVarStyleValue(value: string): boolean {
  return PALETTE_COLOR_VALUES.has(value.trim());
}

export function isCustomTokenCssVarStyleValue(
  value: string,
  options: readonly SemanticColorOption[] = [],
): boolean {
  const normalized = value.trim();
  return options.some((option) => option.value === normalized);
}

export function isThemeModeColorValue(
  value: string,
  customColorOptions: readonly SemanticColorOption[] = [],
): boolean {
  return (
    isThemeTokenValue(value) ||
    isSemanticCssVarStyleValue(value) ||
    isPaletteCssVarStyleValue(value) ||
    isCustomTokenCssVarStyleValue(value, customColorOptions)
  );
}

export function isThemeModeShadowValue(value: string): boolean {
  const trimmed = value.trim();
  return isShadowTokenValue(trimmed) || SHADOW_THEME_VALUES.has(trimmed);
}

export function isThemeModeDimensionValue(
  value: string,
  property: StylePropertyKey,
): boolean {
  const trimmed = value.trim();
  if (!isCssLengthTokenValue(trimmed)) {
    return false;
  }

  return dimensionTokenOptionsForProperty(property).some(
    (option) => option.value === trimmed,
  );
}

export function isThemeModeFontFamilyValue(value: string): boolean {
  return TYPOGRAPHY_FONT_FAMILY_OPTIONS.some(
    (option) => option.value === value.trim(),
  );
}

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
          property: patch.property,
          value:
            patch.value !== undefined
              ? patch.value
              : defaultValueForProperty(patch.property),
          ...(patch.valuesByBreakpoint !== undefined
            ? { valuesByBreakpoint: patch.valuesByBreakpoint }
            : {}),
        }
      : {
          ...current,
          ...patch,
          ...(Object.prototype.hasOwnProperty.call(patch, "valuesByBreakpoint") &&
          patch.valuesByBreakpoint === undefined
            ? { valuesByBreakpoint: undefined }
            : {}),
        };

  // Drop explicit undefined valuesByBreakpoint from the object
  const cleaned: StyleRule = {
    property: updated.property,
    ...(updated.value !== undefined ? { value: updated.value } : {}),
    ...(updated.valuesByBreakpoint !== undefined
      ? { valuesByBreakpoint: updated.valuesByBreakpoint }
      : {}),
  };

  next[index] = cleaned;

  return next.filter(
    (rule, ruleIndex) =>
      ruleIndex === index || rule.property !== cleaned.property,
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
  if (property === "boxShadow") {
    return "none";
  }
  if (property === "fontFamily") {
    return "var(--font-sans)";
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
  if (property === "textWrap") {
    return "truncate";
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
  if (property === "position") {
    return "relative";
  }
  if (property === "pointerEvents") {
    return "auto";
  }
  if (property === "zIndex") {
    return "0";
  }
  if (property === "opacity") {
    return "100";
  }
  if (property === "backdropFilter") {
    return "blur(8px)";
  }
  if (property === "flexWrap") {
    return "wrap";
  }
  if (property === "borderStyle") {
    return "solid";
  }
  if (isDimensionStyleProperty(property)) {
    return numericStyleInputMin(property) === 1 ? "1" : "0";
  }
  if (property === "borderWidth") {
    return "1";
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

export function isShadowStyleProperty(property: StylePropertyKey): boolean {
  return property === "boxShadow";
}

export function isBackdropFilterStyleProperty(
  property: StylePropertyKey,
): boolean {
  return property === "backdropFilter";
}

export function isTypographyStyleProperty(property: StylePropertyKey): boolean {
  return property === "fontFamily";
}

export function isDimensionStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "fontSize" ||
    property.startsWith("margin") ||
    property.startsWith("padding") ||
    property === "gap" ||
    property === "width" ||
    property === "minWidth" ||
    property === "maxWidth" ||
    property === "height" ||
    property === "minHeight" ||
    property === "maxHeight" ||
    property === "top" ||
    property === "right" ||
    property === "bottom" ||
    property === "left" ||
    property === "letterSpacing" ||
    property === "borderRadius" ||
    property === "borderTopLeftRadius" ||
    property === "borderTopRightRadius" ||
    property === "borderBottomLeftRadius" ||
    property === "borderBottomRightRadius"
  );
}

export function isThemeTokenStyleValue(value: string): boolean {
  return isThemeModeColorValue(value);
}

export function isNumericStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "borderWidth" ||
    property === "zIndex" ||
    property === "opacity"
  );
}

/** Minimum allowed value for numeric style inputs (pixels). */
export function numericStyleInputMin(property: StylePropertyKey): number {
  if (isMarginStyleProperty(property)) {
    return NEGATIVE_MARGIN_MIN_PX;
  }
  if (property === "borderWidth" || property === "fontSize") {
    return 1;
  }
  if (property === "opacity") {
    return 0;
  }
  if (property === "zIndex") {
    return -999;
  }
  return 0;
}

export function coerceNumericStyleValue(
  property: StylePropertyKey,
  raw: string,
): string {
  if (isMarginStyleProperty(property)) {
    return String(parseMarginPx(raw) ?? 0);
  }

  const min = numericStyleInputMin(property);
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return String(min);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return String(min);
  }

  if (property === "zIndex") {
    return String(parsed);
  }

  if (property === "opacity") {
    return String(Math.min(100, Math.max(0, parsed)));
  }

  return String(Math.max(min, parsed));
}

export function isEnumStyleProperty(property: StylePropertyKey): boolean {
  return (
    property === "fontWeight" ||
    property === "fontStyle" ||
    property === "textDecoration" ||
    property === "textAlign" ||
    property === "textWrap" ||
    property === "alignItems" ||
    property === "justifyContent" ||
    property === "alignSelf" ||
    property === "flex" ||
    property === "flexWrap" ||
    property === "borderStyle" ||
    property === "overflowX" ||
    property === "overflowY" ||
    property === "position" ||
    property === "pointerEvents"
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
    case "textWrap":
      return [
        { value: "truncate", label: "Single line (ellipsis)" },
        { value: "wrap", label: "Wrap to next line" },
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
    case "position":
      return [
        { value: "static", label: "Static" },
        { value: "relative", label: "Relative" },
        { value: "absolute", label: "Absolute" },
      ];
    case "pointerEvents":
      return [
        { value: "auto", label: "Auto" },
        { value: "none", label: "None" },
      ];
    default:
      return [];
  }
}

export function formatStyleRuleValuePreview(rule: StyleRule): string {
  const parts: string[] = [];

  if (rule.value !== undefined) {
    if (isEnumStyleProperty(rule.property)) {
      const match = enumOptionsForProperty(rule.property).find(
        (option) => option.value === String(rule.value),
      );
      parts.push(match?.label ?? String(rule.value));
    } else {
      const raw = String(rule.value);
      parts.push(raw.length > 32 ? `${raw.slice(0, 29)}...` : raw);
    }
  }

  if (rule.valuesByBreakpoint) {
    for (const bp of [
      "base",
      "sm",
      "md",
      "lg",
      "xl",
    ] as const) {
      const bpValue = rule.valuesByBreakpoint[bp];
      if (bpValue !== undefined) {
        parts.push(`${bp}:${String(bpValue)}`);
      }
    }
  }

  if (parts.length === 0) {
    return "—";
  }

  const preview = parts.join(" · ");
  return preview.length > 48 ? `${preview.slice(0, 45)}...` : preview;
}

export function isValidShadowCustomValue(value: string): boolean {
  return isCssBoxShadowValue(value);
}

export function isValidBackdropFilterCustomValue(value: string): boolean {
  return isCssBackdropFilterValue(value);
}

export function isValidFontFamilyCustomValue(value: string): boolean {
  return isCssFontFamilyValue(value);
}

export type BoxLengthCustomUnit = "px" | "%" | "auto";

const PERCENT_DIMENSION_PROPERTIES = new Set<StylePropertyKey>([
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
  "letterSpacing",
]);

const AUTO_DIMENSION_PROPERTIES = new Set<StylePropertyKey>([
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
]);

export function supportsPercentDimensionUnit(
  property: StylePropertyKey,
): boolean {
  return PERCENT_DIMENSION_PROPERTIES.has(property);
}

export function supportsAutoDimensionUnit(property: StylePropertyKey): boolean {
  return AUTO_DIMENSION_PROPERTIES.has(property);
}

export function dimensionCustomUnitsForProperty(
  property: StylePropertyKey,
): readonly BoxLengthCustomUnit[] {
  const units: BoxLengthCustomUnit[] = ["px"];
  if (supportsPercentDimensionUnit(property)) {
    units.push("%");
  }
  if (supportsAutoDimensionUnit(property)) {
    units.push("auto");
  }
  return units;
}

export function parseBoxLengthCustomValue(
  property: StylePropertyKey,
  value: string,
): { readonly amount: string; readonly unit: BoxLengthCustomUnit } {
  const trimmed = value.trim();
  if (trimmed === "auto" && supportsAutoDimensionUnit(property)) {
    return { amount: "", unit: "auto" };
  }

  const percentMatch = /^(-?\d+(?:\.\d+)?)%$/.exec(trimmed);
  if (percentMatch && supportsPercentDimensionUnit(property)) {
    return { amount: percentMatch[1] ?? "", unit: "%" };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed)) {
    return { amount: String(parsed), unit: "px" };
  }

  return {
    amount: String(numericStyleInputMin(property)),
    unit: "px",
  };
}

export function formatBoxLengthCustomValue(
  property: StylePropertyKey,
  amount: string,
  unit: BoxLengthCustomUnit,
): string {
  if (unit === "auto") {
    return supportsAutoDimensionUnit(property)
      ? "auto"
      : String(numericStyleInputMin(property));
  }

  if (unit === "%") {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed)) {
      return "100%";
    }
    return `${parsed}%`;
  }

  return coerceNumericStyleValue(property, amount);
}

export function isValidDimensionCustomValue(
  property: StylePropertyKey,
  value: string,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (isThemeModeDimensionValue(trimmed, property)) {
    return true;
  }

  if (trimmed === "auto") {
    return supportsAutoDimensionUnit(property);
  }

  if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
    return supportsPercentDimensionUnit(property);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  if (isMarginStyleProperty(property)) {
    return parsed >= NEGATIVE_MARGIN_MIN_PX;
  }

  return parsed >= numericStyleInputMin(property);
}
