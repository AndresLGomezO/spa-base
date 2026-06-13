import { isCssColorValue, isThemeTokenValue } from "@repo/ui-builder-core";
import { Input, SegmentedSwitch, Text, Select } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  isSemanticCssVarStyleValue,
  isThemeModeColorValue,
  SEMANTIC_COLOR_OPTIONS,
  THEME_TOKEN_OPTIONS,
} from "./style-rules-state.js";

export interface ColorValueEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labels: StyleRulesEditorLabels;
}

export function ColorValueEditor({
  value,
  onChange,
  labels,
}: ColorValueEditorProps) {
  const rawValue = value;
  const themeMode = isThemeModeColorValue(rawValue);
  const colorMode = themeMode ? ("theme" as const) : ("custom" as const);
  const themeLabel = labels.styleColorTheme ?? "Theme";
  const customLabel = labels.styleColorCustom ?? "Custom";
  const themeTokensLabel = labels.styleColorThemeTokens ?? "Theme tokens";
  const semanticTokensLabel =
    labels.styleColorSemanticTokens ?? "Semantic colors";
  const customInputLabel = labels.styleColorCustomInput ?? "Custom color";
  const invalidLabel = labels.styleColorInvalid ?? "Enter a valid color value.";
  const showInvalid =
    colorMode === "custom" &&
    rawValue.trim().length > 0 &&
    !isCssColorValue(rawValue);

  const swatchStyle = themeMode
    ? isThemeTokenValue(rawValue)
      ? undefined
      : { backgroundColor: rawValue }
    : isCssColorValue(rawValue)
      ? { backgroundColor: rawValue }
      : undefined;

  const swatchClassName = isThemeTokenValue(rawValue)
    ? rawValue === "transparent"
      ? "bg-transparent"
      : rawValue === "background"
        ? "bg-background"
        : rawValue === "foreground"
          ? "bg-foreground"
          : rawValue === "default"
            ? "bg-card"
            : `bg-${rawValue}`
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
              placeholder="#rrggbb, rgb(), hsl(), var(--color-primary)"
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
