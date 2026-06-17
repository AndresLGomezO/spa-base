import { Input, SegmentedSwitch, Select, Text } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  isThemeModeFontFamilyValue,
  isValidFontFamilyCustomValue,
  TYPOGRAPHY_FONT_FAMILY_OPTIONS,
} from "./style-rules-state.js";

export interface TypographyValueEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labels: StyleRulesEditorLabels;
}

export function TypographyValueEditor({
  value,
  onChange,
  labels,
}: TypographyValueEditorProps) {
  const rawValue = value;
  const themeMode = isThemeModeFontFamilyValue(rawValue);
  const mode = themeMode ? ("theme" as const) : ("custom" as const);
  const themeLabel = labels.styleTypographyTheme ?? "Theme";
  const customLabel = labels.styleTypographyCustom ?? "Custom";
  const tokensLabel = labels.styleTypographyTokens ?? "Font family tokens";
  const customInputLabel = labels.styleTypographyCustomInput ?? "Font family";
  const invalidLabel =
    labels.styleTypographyInvalid ?? "Enter a valid font family value.";
  const showInvalid =
    mode === "custom" &&
    rawValue.trim().length > 0 &&
    !isValidFontFamilyCustomValue(rawValue);

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
              ? (TYPOGRAPHY_FONT_FAMILY_OPTIONS[0]?.value ?? "var(--font-sans)")
              : "Inter, ui-sans-serif, system-ui, sans-serif",
          );
        }}
        ariaLabel={themeLabel}
      />
      {mode === "theme" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{tokensLabel}</span>
          <Select
            value={
              TYPOGRAPHY_FONT_FAMILY_OPTIONS.some(
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
              {tokensLabel}
            </option>
            {TYPOGRAPHY_FONT_FAMILY_OPTIONS.map((option) => (
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
            value={rawValue}
            placeholder="Inter, ui-sans-serif, system-ui, sans-serif"
            onChange={(event) => onChange(event.target.value)}
          />
          {showInvalid ? (
            <Text className="text-destructive text-xs">{invalidLabel}</Text>
          ) : null}
        </label>
      )}
    </div>
  );
}
