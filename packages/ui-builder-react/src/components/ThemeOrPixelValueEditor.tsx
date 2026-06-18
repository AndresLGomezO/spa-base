import type { StylePropertyKey } from "@repo/ui-builder-core";
import { Input, SegmentedSwitch, Select, Text } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  defaultValueForProperty,
  dimensionCustomUnitsForProperty,
  dimensionTokenOptionsForProperty,
  formatBoxLengthCustomValue,
  isThemeModeDimensionValue,
  isValidDimensionCustomValue,
  numericStyleInputMin,
  parseBoxLengthCustomValue,
  type BoxLengthCustomUnit,
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
  const customLabel = labels.styleDimensionCustom ?? "Custom";
  const tokensLabel = labels.styleDimensionTokens ?? "Theme tokens";
  const customInputLabel = labels.styleDimensionCustomInput ?? "Value";
  const unitLabel = labels.styleDimensionUnit ?? "Unit";
  const invalidLabel =
    labels.styleDimensionInvalid ??
    "Enter a valid pixel value, percentage, auto, or theme token.";
  const customUnits = dimensionCustomUnitsForProperty(property);
  const parsedCustom = parseBoxLengthCustomValue(property, rawValue);
  const showUnitSelector = customUnits.length > 1;
  const showInvalid =
    mode === "custom" &&
    rawValue.trim().length > 0 &&
    !isValidDimensionCustomValue(property, rawValue);

  const updateCustomValue = (
    nextAmount: string,
    nextUnit: BoxLengthCustomUnit,
  ) => {
    onChange(formatBoxLengthCustomValue(property, nextAmount, nextUnit));
  };

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
        <div className="flex flex-col gap-2">
          {parsedCustom.unit === "auto" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{unitLabel}</span>
              <Select
                value={parsedCustom.unit}
                onChange={(event) =>
                  updateCustomValue(
                    parsedCustom.amount,
                    event.target.value as BoxLengthCustomUnit,
                  )
                }
              >
                {customUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </label>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  {customInputLabel}
                </span>
                <Input
                  type="number"
                  min={numericStyleInputMin(property)}
                  step={parsedCustom.unit === "%" ? 0.1 : 1}
                  value={parsedCustom.amount}
                  onChange={(event) =>
                    updateCustomValue(event.target.value, parsedCustom.unit)
                  }
                />
              </label>
              {showUnitSelector ? (
                <label className="flex w-24 flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">{unitLabel}</span>
                  <Select
                    value={parsedCustom.unit}
                    onChange={(event) =>
                      updateCustomValue(
                        parsedCustom.amount,
                        event.target.value as BoxLengthCustomUnit,
                      )
                    }
                  >
                    {customUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
            </div>
          )}
          {showInvalid ? (
            <Text className="text-destructive text-xs">{invalidLabel}</Text>
          ) : null}
        </div>
      )}
    </div>
  );
}
