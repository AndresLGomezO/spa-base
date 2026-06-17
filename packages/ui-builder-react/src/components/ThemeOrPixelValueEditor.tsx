import type { StylePropertyKey } from "@repo/ui-builder-core";
import { Input, SegmentedSwitch, Select, Text } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  coerceNumericStyleValue,
  defaultValueForProperty,
  dimensionTokenOptionsForProperty,
  isThemeModeDimensionValue,
  isValidDimensionCustomValue,
  numericStyleInputMin,
} from "./style-rules-state.js";

export interface ThemeOrPixelValueEditorProps {
  readonly property: StylePropertyKey;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labels: StyleRulesEditorLabels;
}

export function ThemeOrPixelValueEditor({
  property,
  value,
  onChange,
  labels,
}: ThemeOrPixelValueEditorProps) {
  const rawValue = value;
  const tokenOptions = dimensionTokenOptionsForProperty(property);
  const themeMode = isThemeModeDimensionValue(rawValue, property);
  const mode = themeMode ? ("theme" as const) : ("custom" as const);
  const themeLabel = labels.styleDimensionTheme ?? "Theme";
  const customLabel = labels.styleDimensionCustom ?? "Custom (px)";
  const tokensLabel = labels.styleDimensionTokens ?? "Theme tokens";
  const customInputLabel = labels.styleDimensionCustomInput ?? "Value (px)";
  const invalidLabel =
    labels.styleDimensionInvalid ?? "Enter a valid pixel value or theme token.";
  const showInvalid =
    mode === "custom" &&
    rawValue.trim().length > 0 &&
    !isValidDimensionCustomValue(property, rawValue);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SegmentedSwitch
        value={mode}
        options={[
          { value: "theme", label: themeLabel, ariaLabel: themeLabel },
          { value: "custom", label: customLabel, ariaLabel: customLabel },
        ]}
        onChange={(nextMode) => {
          onChange(
            nextMode === "theme"
              ? (tokenOptions[0]?.value ??
                  String(defaultValueForProperty(property)))
              : String(numericStyleInputMin(property)),
          );
        }}
        ariaLabel={themeLabel}
      />
      {mode === "theme" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{tokensLabel}</span>
          <Select
            value={
              tokenOptions.some((option) => option.value === rawValue)
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
              {tokensLabel}
            </option>
            {tokenOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{customInputLabel}</span>
          <Input
            type="number"
            min={numericStyleInputMin(property)}
            step={1}
            value={rawValue}
            onChange={(event) =>
              onChange(coerceNumericStyleValue(property, event.target.value))
            }
          />
          {showInvalid ? (
            <Text className="text-destructive text-xs">{invalidLabel}</Text>
          ) : null}
        </label>
      )}
    </div>
  );
}
