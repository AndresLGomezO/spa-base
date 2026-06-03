import type { ReactNode } from "react";
import {
  createDefaultComponent,
  type BadgeComponentConfig,
  type ConditionalStyleRule,
  type DataSource,
  type FieldUiComponentConfig,
  type StyleRule,
  isFieldUiComponent,
  type UiComponentConfig,
  type UiComponentKind,
} from "@repo/ui-builder-core";
import { Button, Input, Text, clampCardImageSizePx } from "@repo/ui";

import {
  filterFieldsForComponentKind,
  type FieldDescriptor,
} from "../adapters/entity-card-view-adapter.js";
import {
  LabelConfigEditor,
  type LabelConfigEditorLabels,
} from "./LabelConfigEditor.js";
import {
  StyleRulesEditor,
  type StyleRulesEditorLabels,
} from "./StyleRulesEditor.js";

const DEFAULT_COMPONENT_KINDS: readonly UiComponentKind[] = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "metric-kpi",
];

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

function formatFieldOptionLabel(field: FieldDescriptor): string {
  return `${field.label} (${field.path})`;
}

function collectUsedFieldPaths(
  fieldConfig: FieldUiComponentConfig,
  excludeFallbackIndex?: number,
): Set<string> {
  const used = new Set<string>();

  if (fieldConfig.primary.type === "field") {
    used.add(fieldConfig.primary.path);
  }

  (fieldConfig.fallbacks ?? []).forEach((source, index) => {
    if (index === excludeFallbackIndex || source.type !== "field") {
      return;
    }
    used.add(source.path);
  });

  return used;
}

function getFallbackFieldOptions(
  filtered: readonly FieldDescriptor[],
  fieldConfig: FieldUiComponentConfig,
  fallbackIndex: number,
): readonly FieldDescriptor[] {
  const usedPaths = collectUsedFieldPaths(fieldConfig, fallbackIndex);
  return filtered.filter((field) => !usedPaths.has(field.path));
}

function getNextFallbackFieldPath(
  filtered: readonly FieldDescriptor[],
  fieldConfig: FieldUiComponentConfig,
): string | undefined {
  const usedPaths = collectUsedFieldPaths(fieldConfig);
  return filtered.find((field) => !usedPaths.has(field.path))?.path;
}

const BADGE_VARIANTS = [
  "success",
  "warning",
  "danger",
  "info",
  "default",
  "active",
  "pending",
  "closed",
  "neutral",
] as const;

export interface ComponentConfigEditorLabels {
  readonly component: string;
  readonly staticValue: string;
  readonly field: string;
  readonly fallbacks: string;
  readonly remove: string;
  readonly addFallback: string;
  readonly slotSettings: string;
  readonly componentStyles: string;
  readonly badgeColorRules: string;
  readonly matchValue: string;
  readonly addRule: string;
  readonly imageSize: string;
  readonly dateDisplayFormat: string;
  readonly displayFormat: string;
  readonly showCurrency: string;
  readonly showToneColors: string;
  readonly styleRules: StyleRulesEditorLabels;
  readonly label: LabelConfigEditorLabels;
}

export interface ComponentConfigEditorProps {
  readonly config: UiComponentConfig;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly onChange: (config: UiComponentConfig) => void;
  readonly labels: ComponentConfigEditorLabels;
  readonly metricKpiEditor?: (
    config: Extract<UiComponentConfig, { kind: "metric-kpi" }>,
    onChange: (config: UiComponentConfig) => void,
  ) => ReactNode;
  readonly allowedKinds?: readonly UiComponentKind[];
}

function updatePrimaryField(
  config: FieldUiComponentConfig,
  path: string,
): FieldUiComponentConfig {
  return { ...config, primary: { type: "field", path } };
}

function updateStaticPrimary(
  config: FieldUiComponentConfig,
  value: string,
): FieldUiComponentConfig {
  return { ...config, primary: { type: "static", value } };
}

export function ComponentConfigEditor({
  config,
  fieldDescriptors,
  onChange,
  labels,
  metricKpiEditor,
  allowedKinds = DEFAULT_COMPONENT_KINDS,
}: ComponentConfigEditorProps) {
  const componentKinds = allowedKinds;
  const kind = config.kind;
  const filtered = filterFieldsForComponentKind(fieldDescriptors, kind);

  const handleKindChange = (nextKind: UiComponentKind) => {
    const defaultPath =
      filtered[0]?.path ?? fieldDescriptors[0]?.path ?? "name";
    if (nextKind === "metric-kpi") {
      onChange({
        kind: "metric-kpi",
        metricDefinitionId: "",
        groupBindings: {},
        dimensionBindings: {},
      });
      return;
    }

    if (
      nextKind === "form-field" ||
      nextKind === "form-section" ||
      nextKind === "form-actions" ||
      nextKind === "related-records"
    ) {
      onChange(
        createDefaultComponent(nextKind, defaultPath) as UiComponentConfig,
      );
      return;
    }

    onChange({
      kind: nextKind,
      primary: { type: "field", path: defaultPath },
    } as UiComponentConfig);
  };

  if (config.kind === "metric-kpi") {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.component}</span>
          <select
            className={SELECT_CLASS}
            value={config.kind}
            onChange={(event) =>
              handleKindChange(event.target.value as UiComponentKind)
            }
          >
            {componentKinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {metricKpiEditor?.(config, onChange)}
        <StyleRulesEditor
          styles={config.styles}
          onChange={(styles) => onChange({ ...config, styles })}
          labels={{
            ...labels.styleRules,
            title: labels.componentStyles,
          }}
        />
      </div>
    );
  }

  if (!isFieldUiComponent(config)) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.component}</span>
          <select
            className={SELECT_CLASS}
            value={config.kind}
            onChange={(event) =>
              handleKindChange(event.target.value as UiComponentKind)
            }
          >
            {componentKinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {config.kind === "form-field" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.field}</span>
            <select
              className={SELECT_CLASS}
              value={config.fieldPath}
              onChange={(event) =>
                onChange({ ...config, fieldPath: event.target.value })
              }
            >
              {fieldDescriptors.map((field) => (
                <option key={field.path} value={field.path}>
                  {formatFieldOptionLabel(field)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {config.kind === "form-section" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.label.label}</span>
            <Input
              value={config.title ?? ""}
              onChange={(event) =>
                onChange({ ...config, title: event.target.value || undefined })
              }
            />
          </label>
        ) : null}
        {config.kind === "related-records" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Child entity</span>
              <Input
                value={config.childEntity}
                onChange={(event) =>
                  onChange({ ...config, childEntity: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Foreign key field</span>
              <Input
                value={config.foreignKeyField}
                onChange={(event) =>
                  onChange({ ...config, foreignKeyField: event.target.value })
                }
              />
            </label>
          </>
        ) : null}
      </div>
    );
  }

  const fieldConfig = config;
  const useStatic = fieldConfig.primary.type === "static";

  const updateFallbacks = (fallbacks: readonly DataSource[]) => {
    onChange({ ...fieldConfig, fallbacks });
  };

  const addFallback = () => {
    const path = getNextFallbackFieldPath(filtered, fieldConfig);
    if (!path) {
      return;
    }
    updateFallbacks([
      ...(fieldConfig.fallbacks ?? []),
      { type: "field", path },
    ]);
  };

  const canAddFallback =
    getNextFallbackFieldPath(filtered, fieldConfig) !== undefined;

  const updateConditionalRules = (rules: readonly ConditionalStyleRule[]) => {
    onChange({
      ...fieldConfig,
      conditionalStyles: rules,
    } as BadgeComponentConfig);
  };

  const updateStyles = (styles: readonly StyleRule[]) => {
    onChange({ ...fieldConfig, styles });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.component}</span>
        <select
          className={SELECT_CLASS}
          value={fieldConfig.kind}
          onChange={(event) =>
            handleKindChange(event.target.value as UiComponentKind)
          }
        >
          {componentKinds.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useStatic}
          onChange={(event) => {
            if (event.target.checked) {
              onChange(updateStaticPrimary(fieldConfig, ""));
            } else {
              const path = filtered[0]?.path ?? "name";
              onChange(updatePrimaryField(fieldConfig, path));
            }
          }}
        />
        <span>{labels.staticValue}</span>
      </label>

      {useStatic ? (
        <Input
          value={
            fieldConfig.primary.type === "static"
              ? fieldConfig.primary.value
              : ""
          }
          onChange={(event) =>
            onChange(updateStaticPrimary(fieldConfig, event.target.value))
          }
          placeholder={labels.staticValue}
        />
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.field}</span>
          <select
            className={SELECT_CLASS}
            value={
              fieldConfig.primary.type === "field"
                ? fieldConfig.primary.path
                : ""
            }
            onChange={(event) =>
              onChange(updatePrimaryField(fieldConfig, event.target.value))
            }
          >
            {filtered.map((field) => (
              <option key={field.path} value={field.path}>
                {formatFieldOptionLabel(field)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-2">
        <Text className="text-muted-foreground text-sm">
          {labels.fallbacks}
        </Text>
        {(fieldConfig.fallbacks ?? []).map((source, index) => {
          const fallbackOptions = getFallbackFieldOptions(
            filtered,
            fieldConfig,
            index,
          );

          return (
            <div key={`${index}-${source.type}`} className="flex gap-2">
              <select
                className={SELECT_CLASS}
                value={source.type === "field" ? source.path : ""}
                disabled={source.type !== "field"}
                onChange={(event) => {
                  const fallbacks = [...(fieldConfig.fallbacks ?? [])];
                  fallbacks[index] = {
                    type: "field",
                    path: event.target.value,
                  };
                  updateFallbacks(fallbacks);
                }}
              >
                {fallbackOptions.map((field) => (
                  <option key={field.path} value={field.path}>
                    {formatFieldOptionLabel(field)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateFallbacks(
                    (fieldConfig.fallbacks ?? []).filter((_, i) => i !== index),
                  );
                }}
              >
                {labels.remove}
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={!canAddFallback}
          onClick={addFallback}
        >
          {labels.addFallback}
        </Button>
      </div>

      <div className="border-border flex flex-col gap-3 rounded-md border p-3">
        <Text className="font-medium text-sm">{labels.slotSettings}</Text>

        <LabelConfigEditor
          label={fieldConfig.label}
          onChange={(label) => onChange({ ...fieldConfig, label })}
          labels={labels.label}
        />

        {fieldConfig.kind === "image" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.imageSize}</span>
            <Input
              type="number"
              min={24}
              max={96}
              step={1}
              value={fieldConfig.imageSize ?? ""}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw.length === 0) {
                  onChange({ ...fieldConfig, imageSize: undefined });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onChange({
                  ...fieldConfig,
                  imageSize: clampCardImageSizePx(parsed),
                });
              }}
            />
          </label>
        ) : null}

        {fieldConfig.kind === "date" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.dateDisplayFormat}
            </span>
            <select
              className={SELECT_CLASS}
              value={fieldConfig.dateDisplayFormat ?? "datetime"}
              onChange={(event) =>
                onChange({
                  ...fieldConfig,
                  dateDisplayFormat: event.target.value as
                    | "date"
                    | "datetime"
                    | "time",
                })
              }
            >
              <option value="date">date</option>
              <option value="datetime">datetime</option>
              <option value="time">time</option>
            </select>
          </label>
        ) : null}

        {fieldConfig.kind === "numeric" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.displayFormat}
              </span>
              <select
                className={SELECT_CLASS}
                value={fieldConfig.displayFormat ?? "plain"}
                onChange={(event) =>
                  onChange({
                    ...fieldConfig,
                    displayFormat: event.target.value as
                      | "currency"
                      | "plain"
                      | "percentage",
                  })
                }
              >
                <option value="plain">plain</option>
                <option value="currency">currency</option>
                <option value="percentage">percentage</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldConfig.showCurrency ?? false}
                onChange={(event) =>
                  onChange({
                    ...fieldConfig,
                    showCurrency: event.target.checked,
                  })
                }
              />
              <span>{labels.showCurrency}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldConfig.showToneColors ?? false}
                onChange={(event) =>
                  onChange({
                    ...fieldConfig,
                    showToneColors: event.target.checked,
                  })
                }
              />
              <span>{labels.showToneColors}</span>
            </label>
          </>
        ) : null}

        <StyleRulesEditor
          styles={fieldConfig.styles}
          onChange={updateStyles}
          labels={{
            ...labels.styleRules,
            title: labels.componentStyles,
          }}
        />

        {fieldConfig.kind === "badge" ? (
          <div className="flex flex-col gap-2">
            <Text className="text-muted-foreground text-sm">
              {labels.badgeColorRules}
            </Text>
            {(fieldConfig.conditionalStyles ?? []).map((rule, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={rule.matchValue}
                  onChange={(event) => {
                    const rules = [...(fieldConfig.conditionalStyles ?? [])];
                    rules[index] = {
                      ...rule,
                      matchValue: event.target.value,
                    };
                    updateConditionalRules(rules);
                  }}
                  placeholder={labels.matchValue}
                />
                <select
                  className={SELECT_CLASS}
                  value={rule.badgeVariant ?? "default"}
                  onChange={(event) => {
                    const rules = [...(fieldConfig.conditionalStyles ?? [])];
                    rules[index] = {
                      ...rule,
                      badgeVariant: event.target
                        .value as ConditionalStyleRule["badgeVariant"],
                    };
                    updateConditionalRules(rules);
                  }}
                >
                  {BADGE_VARIANTS.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    updateConditionalRules(
                      (fieldConfig.conditionalStyles ?? []).filter(
                        (_, i) => i !== index,
                      ),
                    );
                  }}
                >
                  {labels.remove}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateConditionalRules([
                  ...(fieldConfig.conditionalStyles ?? []),
                  { matchValue: "", badgeVariant: "default" },
                ]);
              }}
            >
              {labels.addRule}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
