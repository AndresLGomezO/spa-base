import {
  isCssColorValue,
  isThemeTokenValue,
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";
import { Button, Input, SegmentedSwitch, Text } from "@repo/ui";

import {
  addStyleRule,
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isSemanticCssVarStyleValue,
  isThemeModeColorValue,
  numericStyleInputMin,
  removeStyleRule,
  SEMANTIC_COLOR_OPTIONS,
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
    <div className="flex min-w-[8rem] flex-1 flex-col gap-2">
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
            if (mode === "theme") {
              onChange("default");
            } else {
              onChange("#000000");
            }
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
              Select token
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
              Select semantic color
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
                labels={labels}
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
