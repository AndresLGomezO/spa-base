import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";
import { Button, Input, Text, Select } from "@repo/ui";

import {
  addStyleRule,
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  numericStyleInputMin,
  removeStyleRule,
  upsertStyleRule,
} from "./style-rules-state.js";
import { ColorValueEditor } from "./ColorValueEditor.js";

export interface StyleRulesEditorLabels {
  readonly title?: string;
  readonly rowStyles?: string;
  readonly addStyleRule: string;
  readonly saveStyleRule?: string;
  readonly removeStyleRule: string;
  readonly styleProperty: string;
  readonly styleValue: string;
  readonly styleColorTheme?: string;
  readonly styleColorCustom?: string;
  readonly styleColorThemeTokens?: string;
  readonly styleColorSemanticTokens?: string;
  readonly styleColorCustomInput?: string;
  readonly styleColorInvalid?: string;
}

export interface StyleRulesEditorProps {
  readonly styles?: readonly StyleRule[];
  readonly onChange: (styles: readonly StyleRule[]) => void;
  readonly labels: StyleRulesEditorLabels;
  readonly className?: string;
}

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

export function StyleRulesEditor({
  styles = [],
  onChange,
  labels,
  className,
}: StyleRulesEditorProps) {
  const updateRule = (index: number, patch: Partial<StyleRule>) => {
    onChange(upsertStyleRule(styles, index, patch));
  };

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      {labels.title ? (
        <Text className="text-muted-foreground text-sm">{labels.title}</Text>
      ) : null}

      {(styles ?? []).map((rule, index) => (
        <div key={`${index}-${rule.property}`} className="flex flex-wrap gap-2">
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.styleProperty}
            </span>
            <Select
              value={rule.property}
              onChange={(event) =>
                updateRule(index, {
                  property: event.target.value as StylePropertyKey,
                })
              }
            >
              {STYLE_PROPERTY_OPTIONS.map((property) => (
                <option key={property} value={property}>
                  {formatPropertyLabel(property)}
                </option>
              ))}
            </Select>
          </label>

          {isColorStyleProperty(rule.property) ? (
            <div className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              <ColorStyleValueInput
                rule={rule}
                labels={labels}
                onChange={(value) => updateRule(index, { value })}
              />
            </div>
          ) : (
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              {isEnumStyleProperty(rule.property) ? (
                <Select
                  value={String(rule.value)}
                  onChange={(event) =>
                    updateRule(index, { value: event.target.value })
                  }
                >
                  {enumOptionsForProperty(rule.property).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : isNumericStyleProperty(rule.property) ? (
                <Input
                  type="number"
                  min={numericStyleInputMin(rule.property)}
                  step={1}
                  value={String(rule.value)}
                  onChange={(event) =>
                    updateRule(index, {
                      value: coerceNumericStyleValue(
                        rule.property,
                        event.target.value,
                      ),
                    })
                  }
                />
              ) : (
                <Input
                  value={String(rule.value)}
                  onChange={(event) =>
                    updateRule(index, { value: event.target.value })
                  }
                />
              )}
            </label>
          )}

          <Button
            type="button"
            variant="outline"
            className="self-end"
            onClick={() => onChange(removeStyleRule(styles, index))}
          >
            {labels.removeStyleRule}
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(addStyleRule(styles))}
      >
        {labels.addStyleRule}
      </Button>
    </div>
  );
}
