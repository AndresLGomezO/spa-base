import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
  type ThemeColorRole,
} from "@repo/ui-builder-core";
import { Input, Select } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  coerceNumericStyleValue,
  defaultValueForProperty,
  enumOptionsForProperty,
  isBackdropFilterStyleProperty,
  isColorStyleProperty,
  isDimensionStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isShadowStyleProperty,
  isTypographyStyleProperty,
  numericStyleInputMin,
} from "./style-rules-state.js";
import { ColorValueEditor } from "./ColorValueEditor.js";
import { ShadowValueEditor } from "./ShadowValueEditor.js";
import { ThemeOrPixelValueEditor } from "./ThemeOrPixelValueEditor.js";
import { TypographyValueEditor } from "./TypographyValueEditor.js";

function formatPropertyLabel(property: StylePropertyKey): string {
  return property
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function colorRoleForProperty(property: StylePropertyKey): ThemeColorRole {
  if (property === "color") {
    return "text";
  }
  if (property === "borderColor") {
    return "border";
  }
  return "background";
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
      <ColorValueEditor
        value={String(rule.value)}
        onChange={(value) => onChange({ value })}
        labels={labels}
        colorRole={colorRoleForProperty(rule.property)}
      />
    );
  }

  if (isShadowStyleProperty(rule.property)) {
    return (
      <ShadowValueEditor
        value={String(rule.value)}
        onChange={(value) => onChange({ value })}
        labels={labels}
      />
    );
  }

  if (isBackdropFilterStyleProperty(rule.property)) {
    return (
      <Input
        value={String(rule.value)}
        onChange={(event) => onChange({ value: event.target.value })}
        placeholder="blur(8px)"
      />
    );
  }

  if (isTypographyStyleProperty(rule.property)) {
    return (
      <TypographyValueEditor
        value={String(rule.value)}
        onChange={(value) => onChange({ value })}
        labels={labels}
      />
    );
  }

  if (isDimensionStyleProperty(rule.property)) {
    return (
      <ThemeOrPixelValueEditor
        property={rule.property}
        value={String(rule.value)}
        onChange={(value) => onChange({ value })}
        labels={labels}
      />
    );
  }

  if (isEnumStyleProperty(rule.property)) {
    return (
      <Select
        searchable
        value={String(rule.value)}
        onChange={(event) => onChange({ value: event.target.value })}
      >
        {enumOptionsForProperty(rule.property).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (isNumericStyleProperty(rule.property)) {
    return (
      <Input
        type="number"
        min={numericStyleInputMin(rule.property)}
        max={rule.property === "opacity" ? 100 : undefined}
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
        <Select
          searchable
          value={rule.property}
          onChange={(event) => {
            const property = event.target.value as StylePropertyKey;
            if (property === rule.property) {
              return;
            }
            onChange({
              property,
              value: defaultValueForProperty(property),
            });
          }}
        >
          {STYLE_PROPERTY_OPTIONS.map((property) => (
            <option key={property} value={property}>
              {formatPropertyLabel(property)}
            </option>
          ))}
        </Select>
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
