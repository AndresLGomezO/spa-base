import { Input, SegmentedSwitch, Select, Text } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  isThemeModeShadowValue,
  isValidShadowCustomValue,
  SHADOW_SHORTCUT_OPTIONS,
  SHADOW_VAR_OPTIONS,
} from "./style-rules-state.js";

export interface ShadowValueEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labels: StyleRulesEditorLabels;
}

export function ShadowValueEditor({
  value,
  onChange,
  labels,
}: ShadowValueEditorProps) {
  const rawValue = value;
  const themeMode = isThemeModeShadowValue(rawValue);
  const mode = themeMode ? ("theme" as const) : ("custom" as const);
  const themeLabel = labels.styleShadowTheme ?? "Theme";
  const customLabel = labels.styleShadowCustom ?? "Custom";
  const shortcutsLabel = labels.styleShadowShortcuts ?? "Shadow presets";
  const varsLabel = labels.styleShadowVars ?? "Shadow variables";
  const customInputLabel = labels.styleShadowCustomInput ?? "Custom shadow";
  const invalidLabel =
    labels.styleShadowInvalid ??
    "Enter a valid box-shadow value or var(--shadow-*).";
  const showInvalid =
    mode === "custom" &&
    rawValue.trim().length > 0 &&
    !isValidShadowCustomValue(rawValue);

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
            nextMode === "theme" ? "none" : "0px 4px 20px rgba(0,0,0,0.08)",
          );
        }}
        ariaLabel={themeLabel}
      />
      {mode === "theme" ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{shortcutsLabel}</span>
            <Select
              searchable
              value={
                SHADOW_SHORTCUT_OPTIONS.some(
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
                {shortcutsLabel}
              </option>
              {SHADOW_SHORTCUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{varsLabel}</span>
            <Select
              searchable
              value={
                SHADOW_VAR_OPTIONS.some((option) => option.value === rawValue)
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
                {varsLabel}
              </option>
              {SHADOW_VAR_OPTIONS.map((option) => (
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
          <Input
            value={rawValue}
            placeholder="0px 4px 20px rgba(0,0,0,0.08), var(--shadow-card)"
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
