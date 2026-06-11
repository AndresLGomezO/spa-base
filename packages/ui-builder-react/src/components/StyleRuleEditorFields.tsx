import {
  isCssColorValue,
  isThemeTokenValue,
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";
import { Input, SegmentedSwitch, Text } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isSemanticCssVarStyleValue,
  isThemeModeColorValue,
  numericStyleInputMin,
  SEMANTIC_COLOR_OPTIONS,
  THEME_TOKEN_OPTIONS,
} from "./style-rules-state.js";

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

function formatPropertyLabel(property: StylePropertyKey): string {
  return property
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function ColorStyleValueInput({
  rule,
  labels,
  onChange,
}: {
  readonly rule: StyleRule;
  readonly labels: StyleRulesEditorLabels;
  readonly onChange: (value: string) => void;
}) {
  const rawValue = String(rule.value);
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{themeTokensLabel}</span>
          <select
            className={SELECT_CLASS}
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
          </select>
          <span className="text-muted-foreground">{semanticTokensLabel}</span>
          <select
            className={SELECT_CLASS}
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
          </select>
        </label>
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

function StyleRuleValueInput({
  rule,
  labels,
  onChange,
}: {
  readonly rule: StyleRule;
  readonly labels: StyleRulesEditorLabels;
  readonly onChange: (patch: Partial<StyleRule>) => void;
}) {
  if (isColorStyleProperty(rule.property)) {
    return (
      <ColorStyleValueInput
        rule={rule}
        labels={labels}
        onChange={(value) => onChange({ value })}
      />
    );
  }

  if (isEnumStyleProperty(rule.property)) {
    return (
      <select
        className={SELECT_CLASS}
        value={String(rule.value)}
        onChange={(event) => onChange({ value: event.target.value })}
      >
        {enumOptionsForProperty(rule.property).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (isNumericStyleProperty(rule.property)) {
    return (
      <Input
        type="number"
        min={numericStyleInputMin(rule.property)}
        step={1}
        value={String(rule.value)}
        onChange={(event) =>
          onChange({
            value: coerceNumericStyleValue(rule.property, event.target.value),
          })
        }
      />
    );
  }

  return (
    <Input
      value={String(rule.value)}
      onChange={(event) => onChange({ value: event.target.value })}
    />
  );
}

export interface StyleRuleEditorFieldsProps {
  readonly rule: StyleRule;
  readonly labels: StyleRulesEditorLabels;
  readonly onChange: (patch: Partial<StyleRule>) => void;
}

export function StyleRuleEditorFields({
  rule,
  labels,
  onChange,
}: StyleRuleEditorFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.styleProperty}</span>
        <select
          className={SELECT_CLASS}
          value={rule.property}
          onChange={(event) =>
            onChange({ property: event.target.value as StylePropertyKey })
          }
        >
          {STYLE_PROPERTY_OPTIONS.map((property) => (
            <option key={property} value={property}>
              {formatPropertyLabel(property)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.styleValue}</span>
        <StyleRuleValueInput rule={rule} labels={labels} onChange={onChange} />
      </label>
    </div>
  );
}

export function formatStylePropertyLabel(property: StylePropertyKey): string {
  return formatPropertyLabel(property);
}
