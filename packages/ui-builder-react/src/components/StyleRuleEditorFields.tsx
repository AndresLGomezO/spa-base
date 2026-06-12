import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";
import { Input } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  numericStyleInputMin,
} from "./style-rules-state.js";
import { ColorValueEditor } from "./ColorValueEditor.js";

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
  return (
    <ColorValueEditor
      value={String(rule.value)}
      onChange={onChange}
      labels={labels}
    />
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
