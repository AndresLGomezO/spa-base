import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type StyleRule,
  type ThemeColorRole,
} from "@repo/ui-builder-core";
import { Button, Input, Text, Select } from "@repo/ui";

import {
  addStyleRule,
  coerceNumericStyleValue,
  enumOptionsForProperty,
  isColorStyleProperty,
  isDimensionStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isShadowStyleProperty,
  isTypographyStyleProperty,
  numericStyleInputMin,
  removeStyleRule,
  type SemanticColorOption,
  upsertStyleRule,
} from "./style-rules-state.js";
import { ColorValueEditor } from "./ColorValueEditor.js";
import { ShadowValueEditor } from "./ShadowValueEditor.js";
import { ThemeOrPixelValueEditor } from "./ThemeOrPixelValueEditor.js";
import { TypographyValueEditor } from "./TypographyValueEditor.js";

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
  readonly styleColorPaletteTokens?: string;
  readonly styleColorEffects?: string;
  readonly styleColorSidebar?: string;
  readonly styleColorBadge?: string;
  readonly styleColorCustomTokens?: string;
  readonly styleColorCustomInput?: string;
  readonly styleColorInvalid?: string;
  readonly styleShadowTheme?: string;
  readonly styleShadowCustom?: string;
  readonly styleShadowShortcuts?: string;
  readonly styleShadowVars?: string;
  readonly styleShadowCustomInput?: string;
  readonly styleShadowInvalid?: string;
  readonly styleDimensionTheme?: string;
  readonly styleDimensionCustom?: string;
  readonly styleDimensionTokens?: string;
  readonly styleDimensionCustomInput?: string;
  readonly styleDimensionInvalid?: string;
  readonly styleTypographyTheme?: string;
  readonly styleTypographyCustom?: string;
  readonly styleTypographyTokens?: string;
  readonly styleTypographyCustomInput?: string;
  readonly styleTypographyInvalid?: string;
  readonly customColorOptions?: readonly SemanticColorOption[];
}

export type { SemanticColorOption } from "./style-rules-state.js";

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
  readonly onChange: (value: string) => void;
}) {
  if (isColorStyleProperty(rule.property)) {
    return (
      <ColorValueEditor
        value={String(rule.value)}
        onChange={onChange}
        labels={labels}
        colorRole={colorRoleForProperty(rule.property)}
      />
    );
  }

  if (isShadowStyleProperty(rule.property)) {
    return (
      <ShadowValueEditor
        value={String(rule.value)}
        onChange={onChange}
        labels={labels}
      />
    );
  }

  if (isTypographyStyleProperty(rule.property)) {
    return (
      <TypographyValueEditor
        value={String(rule.value)}
        onChange={onChange}
        labels={labels}
      />
    );
  }

  if (isDimensionStyleProperty(rule.property)) {
    return (
      <ThemeOrPixelValueEditor
        property={rule.property}
        value={String(rule.value)}
        onChange={onChange}
        labels={labels}
      />
    );
  }

  if (isEnumStyleProperty(rule.property)) {
    return (
      <Select
        value={String(rule.value)}
        onChange={(event) => onChange(event.target.value)}
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
        step={1}
        value={String(rule.value)}
        onChange={(event) =>
          onChange(coerceNumericStyleValue(rule.property, event.target.value))
        }
      />
    );
  }

  return (
    <Input
      value={String(rule.value)}
      onChange={(event) => onChange(event.target.value)}
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

          {isColorStyleProperty(rule.property) ||
          isShadowStyleProperty(rule.property) ||
          isTypographyStyleProperty(rule.property) ||
          isDimensionStyleProperty(rule.property) ? (
            <div className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              <StyleRuleValueInput
                rule={rule}
                labels={labels}
                onChange={(value) => updateRule(index, { value })}
              />
            </div>
          ) : (
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.styleValue}</span>
              <StyleRuleValueInput
                rule={rule}
                labels={labels}
                onChange={(value) => updateRule(index, { value })}
              />
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
