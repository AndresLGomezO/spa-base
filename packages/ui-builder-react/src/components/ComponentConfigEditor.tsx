import type { ReactNode } from "react";
import type { SerializableEntityDefinition } from "@repo/entities";
import { findFirstImageFieldName } from "@repo/entities";
import {
  createDefaultComponent,
  createDefaultStaticComponent,
  type BadgeComponentConfig,
  type ConditionalStyleRule,
  type DataSource,
  type EntityFieldSelectorComponentConfig,
  type FormFieldComponentConfig,
  type FieldUiComponentConfig,
  type StyleRule,
  isFieldUiComponent,
  isPageUiComponent,
  type UiComponentConfig,
  type UiComponentKind,
  type WizardProgressComponentConfig,
  type WizardStepStatusKind,
} from "@repo/ui-builder-core";
import {
  Button,
  Checkbox,
  Input,
  Select,
  Text,
  MAX_CARD_IMAGE_SIZE_PX,
  MIN_CARD_IMAGE_SIZE_PX,
  clampCardImageSizePx,
} from "@repo/ui";

import {
  filterFieldsForComponentKind,
  type FieldDescriptor,
} from "../adapters/entity-card-view-adapter.js";
import {
  LabelConfigEditor,
  type LabelConfigEditorLabels,
} from "./LabelConfigEditor.js";
import {
  WizardStepLabelConfigEditor,
  type WizardStepLabelConfigEditorLabels,
} from "./WizardStepLabelConfigEditor.js";
import {
  WizardStepperLayoutEditor,
  type WizardStepperLayoutEditorLabels,
} from "./WizardStepperLayoutEditor.js";
import { ColorValueEditor } from "./ColorValueEditor.js";
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

const WIZARD_STEP_STATUS_OPTIONS: readonly WizardStepStatusKind[] = [
  "pending",
  "active",
  "completed",
  "invalid",
] as const;

function updateWizardProgressConditionalRules(
  config: WizardProgressComponentConfig,
  rules: readonly ConditionalStyleRule[],
  onChange: (config: UiComponentConfig) => void,
): void {
  onChange({
    ...config,
    conditionalStyles: rules,
  });
}

function resolveWizardProgressVariant(
  config: WizardProgressComponentConfig,
): "steps" | "bar" | "stepper" {
  return config.variant ?? "steps";
}

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
  readonly entityFieldSelectorLayout?: string;
  readonly entityFieldSelectorLayoutList?: string;
  readonly entityFieldSelectorLayoutListWithLogo?: string;
  readonly entityFieldSelectorLayoutMiniCards?: string;
  readonly entityFieldSelectorEnableSearch?: string;
  readonly entityFieldSelectorCardsPerRow?: string;
  readonly entityFieldSelectorImageField?: string;
  readonly entityFieldSelectorImageFieldAuto?: string;
  readonly entityFieldSelectorEnumLayoutHint?: string;
  readonly booleanFieldDisplay?: string;
  readonly booleanFieldDisplayCheckbox?: string;
  readonly booleanFieldDisplaySwitch?: string;
  readonly booleanFieldSwitchVariant?: string;
  readonly booleanFieldSwitchVariantIos?: string;
  readonly booleanFieldSwitchVariantSquared?: string;
  readonly booleanFieldSwitchWidth?: string;
  readonly booleanFieldSwitchHeight?: string;
  readonly textFieldMultiline?: string;
  readonly textFieldMultilineRows?: string;
  readonly formFieldHideLabel?: string;
  readonly iconName?: string;
  readonly iconSize?: string;
  readonly iconNameHint?: string;
  readonly wizardProgressVariant?: string;
  readonly wizardProgressVariantSteps?: string;
  readonly wizardProgressVariantBar?: string;
  readonly wizardProgressVariantStepper?: string;
  readonly wizardProgressBarTrackColor?: string;
  readonly wizardProgressBarFillColor?: string;
  readonly wizardStepLabel?: WizardStepLabelConfigEditorLabels;
  readonly wizardStepperLayout?: WizardStepperLayoutEditorLabels;
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
  readonly staticImageEditor?: (options: {
    readonly value: string;
    readonly onChange: (value: string) => void;
  }) => ReactNode;
  readonly lucideIconEditor?: (options: {
    readonly value: string;
    readonly onChange: (value: string) => void;
  }) => ReactNode;
  readonly allowedKinds?: readonly UiComponentKind[];
  readonly entityFieldSelectorFieldDescriptors?: readonly FieldDescriptor[];
  readonly displayFieldDescriptors?: readonly FieldDescriptor[];
  readonly definition?: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => SerializableEntityDefinition | undefined;
  readonly hideComponentStyles?: boolean;
  readonly staticContentOnly?: boolean;
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

function resolveEntityFieldSelectorImageFields(
  config: EntityFieldSelectorComponentConfig,
  definition: SerializableEntityDefinition | undefined,
  getDefinition?: (
    entityName: string,
  ) => SerializableEntityDefinition | undefined,
): readonly string[] {
  if (!definition) {
    return [];
  }

  const fieldMeta = definition.fields[config.fieldPath];
  if (fieldMeta?.type !== "relation" || !fieldMeta.relation?.target) {
    return [];
  }

  const targetDefinition = getDefinition?.(fieldMeta.relation.target);
  if (!targetDefinition) {
    return [];
  }

  return Object.entries(targetDefinition.fields)
    .filter(([, meta]) => meta.type === "image")
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

function FormBooleanFieldConfigFields({
  config,
  labels,
  definition,
  onChange,
}: {
  readonly config: FormFieldComponentConfig;
  readonly labels: ComponentConfigEditorLabels;
  readonly definition?: SerializableEntityDefinition;
  readonly onChange: (config: UiComponentConfig) => void;
}) {
  const fieldMeta = definition?.fields[config.fieldPath];
  if (fieldMeta?.type !== "boolean") {
    return null;
  }

  const booleanDisplay = config.booleanDisplay ?? "checkbox";
  const showSwitchOptions = booleanDisplay === "switch";

  function parseDimension(
    raw: string,
    min: number,
    max: number,
  ): number | undefined {
    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      return undefined;
    }
    return parsed;
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          {labels.booleanFieldDisplay ?? "Boolean display"}
        </span>
        <Select
          value={booleanDisplay}
          onChange={(event) =>
            onChange({
              ...config,
              booleanDisplay: event.target
                .value as FormFieldComponentConfig["booleanDisplay"],
            })
          }
        >
          <option value="checkbox">
            {labels.booleanFieldDisplayCheckbox ?? "Checkbox"}
          </option>
          <option value="switch">
            {labels.booleanFieldDisplaySwitch ?? "Switch"}
          </option>
        </Select>
      </label>

      {showSwitchOptions ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.booleanFieldSwitchVariant ?? "Switch style"}
            </span>
            <Select
              value={config.switchVariant ?? "ios"}
              onChange={(event) =>
                onChange({
                  ...config,
                  switchVariant: event.target
                    .value as FormFieldComponentConfig["switchVariant"],
                })
              }
            >
              <option value="ios">
                {labels.booleanFieldSwitchVariantIos ?? "iOS"}
              </option>
              <option value="squared">
                {labels.booleanFieldSwitchVariantSquared ?? "Squared"}
              </option>
            </Select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.booleanFieldSwitchWidth ?? "Switch width (px)"}
              </span>
              <Input
                type="number"
                min={28}
                max={120}
                placeholder="44"
                value={config.switchWidth ?? ""}
                onChange={(event) =>
                  onChange({
                    ...config,
                    switchWidth: parseDimension(event.target.value, 28, 120),
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.booleanFieldSwitchHeight ?? "Switch height (px)"}
              </span>
              <Input
                type="number"
                min={16}
                max={64}
                placeholder="24"
                value={config.switchHeight ?? ""}
                onChange={(event) =>
                  onChange({
                    ...config,
                    switchHeight: parseDimension(event.target.value, 16, 64),
                  })
                }
              />
            </label>
          </div>
        </>
      ) : null}
    </>
  );
}

function FormTextFieldConfigFields({
  config,
  labels,
  definition,
  onChange,
}: {
  readonly config: FormFieldComponentConfig;
  readonly labels: ComponentConfigEditorLabels;
  readonly definition?: SerializableEntityDefinition;
  readonly onChange: (config: UiComponentConfig) => void;
}) {
  const fieldMeta = definition?.fields[config.fieldPath];
  if (fieldMeta?.type !== "string" || fieldMeta.isArray) {
    return null;
  }

  const multiline = config.multiline === true;

  function parseRows(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 2 || parsed > 20) {
      return undefined;
    }
    return parsed;
  }

  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={multiline}
          onChange={(event) =>
            onChange({
              ...config,
              multiline: event.target.checked || undefined,
            })
          }
        />
        <span>{labels.textFieldMultiline ?? "Multiline text input"}</span>
      </label>

      {multiline ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.textFieldMultilineRows ?? "Initial rows"}
          </span>
          <Input
            type="number"
            min={2}
            max={20}
            placeholder="3"
            value={config.multilineRows ?? ""}
            onChange={(event) =>
              onChange({
                ...config,
                multilineRows: parseRows(event.target.value),
              })
            }
          />
        </label>
      ) : null}
    </>
  );
}

function EntityFieldSelectorConfigFields({
  config,
  fieldDescriptors,
  labels,
  definition,
  getDefinition,
  onChange,
}: {
  readonly config: EntityFieldSelectorComponentConfig;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly labels: ComponentConfigEditorLabels;
  readonly definition?: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => SerializableEntityDefinition | undefined;
  readonly onChange: (config: UiComponentConfig) => void;
}) {
  const fieldMeta = definition?.fields[config.fieldPath];
  const isEnumField = fieldMeta?.type === "enum";
  const isRelationField = fieldMeta?.type === "relation";
  const showImageField =
    isRelationField &&
    (config.layout === "list-with-logo" || config.layout === "mini-cards");
  const imageFieldOptions = resolveEntityFieldSelectorImageFields(
    config,
    definition,
    getDefinition,
  );
  const defaultImageField = definition
    ? (resolveEntityFieldSelectorImageFields(
        config,
        definition,
        getDefinition,
      )[0] ??
      (fieldMeta?.type === "relation" && fieldMeta.relation?.target
        ? findFirstImageFieldName(
            getDefinition?.(fieldMeta.relation.target)?.fields ?? {},
          )
        : undefined))
    : undefined;

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.field}</span>
        <Select
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
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          {labels.entityFieldSelectorLayout ?? "Layout"}
        </span>
        <Select
          value={config.layout}
          onChange={(event) =>
            onChange({
              ...config,
              layout: event.target
                .value as EntityFieldSelectorComponentConfig["layout"],
            })
          }
        >
          <option value="list">
            {labels.entityFieldSelectorLayoutList ?? "Simple list"}
          </option>
          <option value="list-with-logo" disabled={isEnumField}>
            {labels.entityFieldSelectorLayoutListWithLogo ?? "List with logos"}
          </option>
          <option value="mini-cards">
            {labels.entityFieldSelectorLayoutMiniCards ?? "Mini cards"}
          </option>
        </Select>
      </label>

      {isEnumField &&
      (config.layout === "list-with-logo" || config.layout === "mini-cards") ? (
        <Text variant="muted" className="text-xs">
          {labels.entityFieldSelectorEnumLayoutHint ??
            "Logo layouts show text only for enum fields."}
        </Text>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.enableSearch !== false}
          onChange={(event) =>
            onChange({ ...config, enableSearch: event.target.checked })
          }
        />
        <span>{labels.entityFieldSelectorEnableSearch ?? "Enable search"}</span>
      </label>

      {config.layout === "mini-cards" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.entityFieldSelectorCardsPerRow ?? "Cards per row"}
          </span>
          <Select
            value={config.cardsPerRow ?? 1}
            onChange={(event) =>
              onChange({
                ...config,
                cardsPerRow: Number.parseInt(event.target.value, 10),
              })
            }
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {showImageField ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.entityFieldSelectorImageField ?? "Image field"}
          </span>
          <Select
            value={config.imageFieldPath ?? defaultImageField ?? ""}
            onChange={(event) =>
              onChange({
                ...config,
                imageFieldPath: event.target.value.trim() || undefined,
              })
            }
          >
            <option value="">
              {labels.entityFieldSelectorImageFieldAuto ??
                "Auto (first image field)"}
            </option>
            {imageFieldOptions.map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {fieldName}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
    </>
  );
}

export function ComponentConfigEditor({
  config,
  fieldDescriptors,
  onChange,
  labels,
  metricKpiEditor,
  staticImageEditor,
  lucideIconEditor,
  allowedKinds = DEFAULT_COMPONENT_KINDS,
  entityFieldSelectorFieldDescriptors,
  displayFieldDescriptors,
  definition,
  getDefinition,
  hideComponentStyles = false,
  staticContentOnly = false,
}: ComponentConfigEditorProps) {
  const componentKinds = allowedKinds;
  const kind = config.kind;
  const displayDescriptorSource = displayFieldDescriptors ?? fieldDescriptors;
  const filtered = filterFieldsForComponentKind(displayDescriptorSource, kind);

  const handleKindChange = (nextKind: UiComponentKind) => {
    const nextDisplayFiltered = filterFieldsForComponentKind(
      displayDescriptorSource,
      nextKind,
    );
    const defaultPath =
      nextDisplayFiltered[0]?.path ??
      displayDescriptorSource[0]?.path ??
      fieldDescriptors[0]?.path ??
      "name";

    if (staticContentOnly) {
      onChange(createDefaultStaticComponent(nextKind));
      return;
    }

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
      nextKind === "entity-field-selector" ||
      nextKind === "form-section" ||
      nextKind === "icon" ||
      nextKind === "user" ||
      nextKind === "form-actions" ||
      nextKind === "wizard-progress" ||
      nextKind === "wizard-step-host" ||
      nextKind === "wizard-actions" ||
      nextKind === "related-records" ||
      nextKind === "page-header" ||
      nextKind === "page-toolbar" ||
      nextKind === "page-metrics" ||
      nextKind === "page-list"
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
          <Select
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
          </Select>
        </label>
        {metricKpiEditor?.(config, onChange)}
        {hideComponentStyles ? null : (
          <StyleRulesEditor
            styles={config.styles}
            onChange={(styles) => onChange({ ...config, styles })}
            labels={{
              ...labels.styleRules,
              title: labels.componentStyles,
            }}
          />
        )}
      </div>
    );
  }

  if (!isFieldUiComponent(config)) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.component}</span>
          <Select
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
          </Select>
        </label>
        {config.kind === "form-field" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.field}</span>
              <Select
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
              </Select>
            </label>
            <FormBooleanFieldConfigFields
              config={config}
              labels={labels}
              definition={definition}
              onChange={onChange}
            />
            <FormTextFieldConfigFields
              config={config}
              labels={labels}
              definition={definition}
              onChange={onChange}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={config.hideLabel === true}
                onChange={(event) =>
                  onChange({
                    ...config,
                    hideLabel: event.target.checked || undefined,
                  })
                }
              />
              <span>{labels.formFieldHideLabel ?? "Hide field label"}</span>
            </label>
          </>
        ) : null}
        {config.kind === "entity-field-selector" ? (
          <EntityFieldSelectorConfigFields
            config={config}
            fieldDescriptors={
              entityFieldSelectorFieldDescriptors ?? fieldDescriptors
            }
            labels={labels}
            definition={definition}
            getDefinition={getDefinition}
            onChange={onChange}
          />
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
        {config.kind === "icon" ? (
          <>
            {lucideIconEditor ? (
              lucideIconEditor({
                value: config.iconName,
                onChange: (iconName) => onChange({ ...config, iconName }),
              })
            ) : (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  {labels.iconName ?? "Icon (Lucide name)"}
                </span>
                <Input
                  value={config.iconName}
                  placeholder="CircleCheck"
                  onChange={(event) =>
                    onChange({ ...config, iconName: event.target.value })
                  }
                />
                {labels.iconNameHint ? (
                  <Text className="text-muted-foreground text-xs">
                    {labels.iconNameHint}
                  </Text>
                ) : null}
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.iconSize ?? "Icon size (px)"}
              </span>
              <Input
                type="number"
                min={12}
                max={96}
                value={config.iconSize ?? ""}
                placeholder="20"
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  onChange({
                    ...config,
                    iconSize:
                      Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed,
                  });
                }}
              />
            </label>
            <LabelConfigEditor
              label={config.label}
              onChange={(label) => onChange({ ...config, label })}
              labels={labels.label}
            />
          </>
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
        {config.kind === "wizard-actions" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["nextLabel", "Next label"],
                ["backLabel", "Back label"],
                ["cancelLabel", "Cancel label"],
                ["submitCreateLabel", "Create label"],
                ["submitEditLabel", "Save label"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Input
                  value={config[key] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...config,
                      [key]: event.target.value.trim() || undefined,
                    })
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
        {config.kind === "wizard-progress" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.wizardProgressVariant ?? "Progress style"}
              </span>
              <Select
                value={resolveWizardProgressVariant(config)}
                onChange={(event) =>
                  onChange({
                    ...config,
                    variant: event.target
                      .value as WizardProgressComponentConfig["variant"],
                  })
                }
              >
                <option value="steps">
                  {labels.wizardProgressVariantSteps ?? "Step list"}
                </option>
                <option value="bar">
                  {labels.wizardProgressVariantBar ?? "Progress bar"}
                </option>
                <option value="stepper">
                  {labels.wizardProgressVariantStepper ?? "Stepper"}
                </option>
              </Select>
            </label>
            {resolveWizardProgressVariant(config) === "bar" ||
            resolveWizardProgressVariant(config) === "stepper" ? (
              <WizardStepLabelConfigEditor
                stepLabel={config.stepLabel}
                onChange={(stepLabel) => onChange({ ...config, stepLabel })}
                colorLabels={labels.styleRules}
                labels={
                  labels.wizardStepLabel ?? {
                    showLabel: labels.label.showLabel,
                    labelPosition: labels.label.labelPosition,
                    labelTop: "Top",
                    labelBottom: "Bottom",
                    labelLeft: "Left",
                    labelRight: "Right",
                    labelHidden: "Hidden",
                    labelAlignLeft: labels.label.labelAlignLeft,
                    labelAlignCenter: labels.label.labelAlignCenter,
                    labelAlignRight: labels.label.labelAlignRight,
                    labelAlignment: "Alignment",
                    labelColor: labels.label.labelColor,
                  }
                }
              />
            ) : null}
            {resolveWizardProgressVariant(config) === "stepper" ? (
              <WizardStepperLayoutEditor
                config={config}
                onChange={(next) => onChange(next)}
                labels={
                  labels.wizardStepperLayout ?? {
                    stepSpacing: "Step spacing (px)",
                    circleSize: "Circle size (px)",
                    labelMaxWidth: "Label max width (px)",
                  }
                }
              />
            ) : null}
            {resolveWizardProgressVariant(config) === "bar" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {labels.wizardProgressBarTrackColor ?? "Bar track color"}
                  </span>
                  <ColorValueEditor
                    value={config.barTrackColor ?? "muted"}
                    onChange={(barTrackColor) =>
                      onChange({ ...config, barTrackColor })
                    }
                    labels={labels.styleRules}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {labels.wizardProgressBarFillColor ?? "Bar fill color"}
                  </span>
                  <ColorValueEditor
                    value={config.barFillColor ?? "primary"}
                    onChange={(barFillColor) =>
                      onChange({ ...config, barFillColor })
                    }
                    labels={labels.styleRules}
                  />
                </label>
              </div>
            ) : null}
            {resolveWizardProgressVariant(config) === "steps" ||
            resolveWizardProgressVariant(config) === "stepper" ? (
              <>
                <Text variant="muted" className="text-xs">
                  Style each status (pending, active, completed, invalid) using
                  conditional rules below.
                </Text>
                <div className="flex flex-col gap-2">
                  <Text className="text-muted-foreground text-sm">
                    {labels.badgeColorRules}
                  </Text>
                  {(config.conditionalStyles ?? []).map((rule, index) => (
                    <div
                      key={index}
                      className="border-border flex flex-col gap-3 rounded-lg border p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-muted-foreground">
                            {labels.matchValue}
                          </span>
                          <Select
                            value={rule.matchValue ?? ""}
                            onChange={(event) => {
                              const rules = [
                                ...(config.conditionalStyles ?? []),
                              ];
                              rules[index] = {
                                ...rule,
                                matchValue: event.target.value,
                              };
                              updateWizardProgressConditionalRules(
                                config,
                                rules,
                                onChange,
                              );
                            }}
                          >
                            <option value="">{labels.matchValue}</option>
                            {WIZARD_STEP_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              updateWizardProgressConditionalRules(
                                config,
                                (config.conditionalStyles ?? []).filter(
                                  (_, ruleIndex) => ruleIndex !== index,
                                ),
                                onChange,
                              );
                            }}
                          >
                            {labels.remove}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-muted-foreground">
                            Background
                          </span>
                          <ColorValueEditor
                            value={rule.background ?? "default"}
                            onChange={(background) => {
                              const rules = [
                                ...(config.conditionalStyles ?? []),
                              ];
                              rules[index] = {
                                ...rule,
                                background,
                              };
                              updateWizardProgressConditionalRules(
                                config,
                                rules,
                                onChange,
                              );
                            }}
                            labels={labels.styleRules}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-muted-foreground">
                            Text color
                          </span>
                          <ColorValueEditor
                            value={rule.textColor ?? "default"}
                            onChange={(textColor) => {
                              const rules = [
                                ...(config.conditionalStyles ?? []),
                              ];
                              rules[index] = {
                                ...rule,
                                textColor,
                              };
                              updateWizardProgressConditionalRules(
                                config,
                                rules,
                                onChange,
                              );
                            }}
                            labels={labels.styleRules}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      updateWizardProgressConditionalRules(
                        config,
                        [
                          ...(config.conditionalStyles ?? []),
                          { matchValue: "active" },
                        ],
                        onChange,
                      );
                    }}
                  >
                    {labels.addRule}
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : null}
        {isPageUiComponent(config) ||
        config.kind === "wizard-step-host" ||
        config.kind === "wizard-actions" ||
        config.kind === "wizard-progress" ||
        config.kind === "entity-field-selector" ||
        config.kind === "form-field" ||
        config.kind === "icon" ? (
          hideComponentStyles ? null : (
            <StyleRulesEditor
              styles={config.styles}
              onChange={(styles) => onChange({ ...config, styles })}
              labels={{
                ...labels.styleRules,
                title: labels.componentStyles,
              }}
            />
          )
        ) : null}
      </div>
    );
  }

  const fieldConfig = config;
  const useStatic = staticContentOnly || fieldConfig.primary.type === "static";

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
        <Select
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
        </Select>
      </label>

      {staticContentOnly ? null : (
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
      )}

      {useStatic ? (
        fieldConfig.kind === "image" && staticImageEditor ? (
          staticImageEditor({
            value:
              fieldConfig.primary.type === "static"
                ? fieldConfig.primary.value
                : "",
            onChange: (value) =>
              onChange(updateStaticPrimary(fieldConfig, value)),
          })
        ) : (
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
        )
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.field}</span>
          <Select
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
          </Select>
        </label>
      )}

      {staticContentOnly ? null : (
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
                <Select
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
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    updateFallbacks(
                      (fieldConfig.fallbacks ?? []).filter(
                        (_, i) => i !== index,
                      ),
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
      )}

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
              min={MIN_CARD_IMAGE_SIZE_PX}
              max={MAX_CARD_IMAGE_SIZE_PX}
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
            <Select
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
            </Select>
          </label>
        ) : null}

        {fieldConfig.kind === "numeric" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.displayFormat}
              </span>
              <Select
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
              </Select>
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

        {hideComponentStyles ? null : (
          <StyleRulesEditor
            styles={fieldConfig.styles}
            onChange={updateStyles}
            labels={{
              ...labels.styleRules,
              title: labels.componentStyles,
            }}
          />
        )}

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
                <Select
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
                </Select>
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
