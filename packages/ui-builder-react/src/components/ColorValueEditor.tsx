import {
  isCssBackgroundFillValue,
  isCssGradientBackgroundValue,
  isThemeTokenValue,
  themeTokenSwatchClass,
  type ThemeColorRole,
} from "@repo/ui-builder-core";
import { Input, SegmentedSwitch, Text, Select } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  BADGE_COLOR_OPTIONS,
  EFFECT_COLOR_OPTIONS,
  isPaletteCssVarStyleValue,
  isSemanticCssVarStyleValue,
  isThemeModeColorValue,
  PALETTE_COLOR_OPTIONS,
  SEMANTIC_COLOR_OPTIONS,
  SIDEBAR_COLOR_OPTIONS,
  THEME_TOKEN_OPTIONS,
  type SemanticColorOption,
} from "./style-rules-state.js";

export type { SemanticColorOption };

export interface ColorValueEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labels: StyleRulesEditorLabels;
  /** Which style property this color applies to — drives swatch accuracy. */
  readonly colorRole?: ThemeColorRole;
  readonly customColorOptions?: readonly SemanticColorOption[];
}

export function ColorValueEditor({
  value,
  onChange,
  labels,
  colorRole = "background",
  customColorOptions: customColorOptionsProp,
}: ColorValueEditorProps) {
  const rawValue = value;
  const customColorOptions =
    customColorOptionsProp ?? labels.customColorOptions ?? [];
  const themeMode = isThemeModeColorValue(rawValue, customColorOptions);
  const colorMode = themeMode ? ("theme" as const) : ("custom" as const);
  const themeLabel = labels.styleColorTheme ?? "Theme";
  const customLabel = labels.styleColorCustom ?? "Custom";
  const themeTokensLabel = labels.styleColorThemeTokens ?? "Theme tokens";
  const semanticTokensLabel =
    labels.styleColorSemanticTokens ?? "Semantic colors";
  const paletteTokensLabel = labels.styleColorPaletteTokens ?? "Palette scale";
  const effectsLabel = labels.styleColorEffects ?? "Effects";
  const sidebarLabel = labels.styleColorSidebar ?? "Sidebar colors";
  const badgeLabel = labels.styleColorBadge ?? "Badge colors";
  const customTokensLabel = labels.styleColorCustomTokens ?? "Custom tokens";
  const customInputLabel = labels.styleColorCustomInput ?? "Custom color";
  const invalidLabel = labels.styleColorInvalid ?? "Enter a valid color value.";
  const showInvalid =
    colorMode === "custom" &&
    rawValue.trim().length > 0 &&
    !isCssBackgroundFillValue(rawValue);

  const swatchFillStyle = (fillValue: string) =>
    isCssGradientBackgroundValue(fillValue)
      ? { background: fillValue }
      : { backgroundColor: fillValue };

  const swatchStyle = themeMode
    ? isThemeTokenValue(rawValue)
      ? undefined
      : swatchFillStyle(rawValue)
    : isCssBackgroundFillValue(rawValue)
      ? swatchFillStyle(rawValue)
      : undefined;

  const swatchClassName = isThemeTokenValue(rawValue)
    ? themeTokenSwatchClass(colorRole, rawValue)
    : undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`border-border h-8 w-8 shrink-0 rounded border ${swatchClassName ?? ""}`}
          style={swatchStyle}
          aria-hidden
        />
        <SegmentedSwitch
          value={colorMode}
          options={[
            { value: "theme", label: themeLabel, ariaLabel: themeLabel },
            { value: "custom", label: customLabel, ariaLabel: customLabel },
          ]}
          onChange={(mode) => {
            onChange(mode === "theme" ? "default" : "#000000");
          }}
          ariaLabel={themeLabel}
        />
      </div>
      {colorMode === "theme" ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{themeTokensLabel}</span>
            <Select
              value={isThemeTokenValue(rawValue) ? rawValue : ""}
              onChange={(event) => {
                if (event.target.value) {
                  onChange(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                {themeTokensLabel}
              </option>
              {THEME_TOKEN_OPTIONS.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{semanticTokensLabel}</span>
            <Select
              value={isSemanticCssVarStyleValue(rawValue) ? rawValue : ""}
              onChange={(event) => {
                if (event.target.value) {
                  onChange(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                {semanticTokensLabel}
              </option>
              {SEMANTIC_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          {EFFECT_COLOR_OPTIONS.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{effectsLabel}</span>
              <Select
                value={
                  EFFECT_COLOR_OPTIONS.some(
                    (option) => option.value === rawValue,
                  )
                    ? rawValue
                    : ""
                }
                onChange={(event) => {
                  if (event.target.value) {
                    onChange(event.target.value);
                  }
                }}
              >
                <option value="" disabled>
                  {effectsLabel}
                </option>
                {EFFECT_COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{sidebarLabel}</span>
            <Select
              value={
                SIDEBAR_COLOR_OPTIONS.some(
                  (option) => option.value === rawValue,
                )
                  ? rawValue
                  : ""
              }
              onChange={(event) => {
                if (event.target.value) {
                  onChange(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                {sidebarLabel}
              </option>
              {SIDEBAR_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{badgeLabel}</span>
            <Select
              value={
                BADGE_COLOR_OPTIONS.some((option) => option.value === rawValue)
                  ? rawValue
                  : ""
              }
              onChange={(event) => {
                if (event.target.value) {
                  onChange(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                {badgeLabel}
              </option>
              {BADGE_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{paletteTokensLabel}</span>
            <Select
              value={isPaletteCssVarStyleValue(rawValue) ? rawValue : ""}
              onChange={(event) => {
                if (event.target.value) {
                  onChange(event.target.value);
                }
              }}
            >
              <option value="" disabled>
                {paletteTokensLabel}
              </option>
              {PALETTE_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          {customColorOptions.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{customTokensLabel}</span>
              <Select
                value={
                  customColorOptions.some((option) => option.value === rawValue)
                    ? rawValue
                    : ""
                }
                onChange={(event) => {
                  if (event.target.value) {
                    onChange(event.target.value);
                  }
                }}
              >
                <option value="" disabled>
                  {customTokensLabel}
                </option>
                {customColorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{customInputLabel}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="border-border h-9 w-12 shrink-0 cursor-pointer rounded border bg-transparent p-1"
              value={/^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue : "#000000"}
              onChange={(event) => onChange(event.target.value)}
            />
            <Input
              value={rawValue}
              placeholder="#rrggbb, rgb(), hsl(), var(--color-primary), linear-gradient(...)"
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
          {showInvalid ? (
            <Text className="text-destructive text-xs">{invalidLabel}</Text>
          ) : null}
        </label>
      )}
    </div>
  );
}
