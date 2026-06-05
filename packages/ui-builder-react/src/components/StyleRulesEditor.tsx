import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";
import { Button, Input, Text } from "@repo/ui";

import {
  addStyleRule,
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isThemeTokenStyleValue,
  numericStyleInputMin,
  removeStyleRule,
  THEME_TOKEN_OPTIONS,
  upsertStyleRule,
} from "./style-rules-state.js";

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

export interface StyleRulesEditorLabels {
  readonly title?: string;
  readonly rowStyles?: string;
  readonly addStyleRule: string;
  readonly removeStyleRule: string;
  readonly styleProperty: string;
  readonly styleValue: string;
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
  onChange,
}: {
  readonly rule: StyleRule;
  readonly onChange: (value: string) => void;
}) {
  const rawValue = String(rule.value);
  const usesThemeToken = isThemeTokenStyleValue(rawValue);

  return (
    <div className="flex min-w-[8rem] flex-1 flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Theme</span>
        <select
          className={SELECT_CLASS}
          value={usesThemeToken ? rawValue : ""}
          onChange={(event) => {
            if (event.target.value) {
              onChange(event.target.value);
            } else {
              onChange("#000000");
            }
          }}
        >
          <option value="">Custom color</option>
          {THEME_TOKEN_OPTIONS.map((token) => (
            <option key={token} value={token}>
              {token}
            </option>
          ))}
        </select>
      </label>
      {!usesThemeToken ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Custom</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="border-border h-9 w-12 shrink-0 cursor-pointer rounded border bg-transparent p-1"
              value={/^#[0-9a-fA-F]{6}$/.test(rawValue) ? rawValue : "#000000"}
              onChange={(event) => onChange(event.target.value)}
            />
            <Input
              value={rawValue}
              placeholder="#rrggbb, rgb(), hsl()"
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        </label>
      ) : null}
    </div>
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
            <select
              className={SELECT_CLASS}
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
            </select>
          </label>

          {isColorStyleProperty(rule.property) ? (
            <div className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              <ColorStyleValueInput
                rule={rule}
                onChange={(value) => updateRule(index, { value })}
              />
            </div>
          ) : (
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              {isEnumStyleProperty(rule.property) ? (
                <select
                  className={SELECT_CLASS}
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
                </select>
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
