import type {
  CardBadgeVariant,
  CardSlotComponentType,
  CardTextColor,
  LayoutSpacingKey,
  SerializableEntityDefinition,
} from "@repo/entities";
import { relationAliasFieldPath } from "@repo/entities";
import {
  Button,
  Checkbox,
  clampCardImageSizePx,
  clampCardTextSizePx,
  DEFAULT_CARD_IMAGE_SIZE_PX,
  CARD_TEXT_COLOR_OPTIONS,
  IconButton,
  Input,
  MAX_CARD_IMAGE_SIZE_PX,
  MAX_CARD_TEXT_SIZE_PX,
  MIN_CARD_IMAGE_SIZE_PX,
  MIN_CARD_TEXT_SIZE_PX,
  SegmentedSwitch,
  stepCardImageSizeDown,
  stepCardImageSizeUp,
  stepCardTextSizeDown,
  stepCardTextSizeUp,
  Text,
} from "@repo/ui";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import { MetricBindingsEditor } from "../metrics/MetricBindingsEditor.js";
import { CardLayoutItemSpacingFields } from "./CardLayoutItemSpacingFields.js";
import type {
  BadgeVariantRule,
  BuilderSlotHorizontalAlign,
  BuilderSlotItemDraft,
} from "./card-layout-builder-state";
import {
  formatFieldLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { resolveLayoutSlotDisplayMeta } from "./resolve-layout-slot-display.js";

const COMPONENT_OPTIONS: readonly CardSlotComponentType[] = [
  "text",
  "date",
  "image",
  "badge",
  "currency",
  "metric-kpi",
];

const BADGE_COLOR_OPTIONS: readonly CardBadgeVariant[] = [
  "success",
  "warning",
  "danger",
  "info",
  "default",
];

const TEXT_SOURCE_OPTIONS = ["field", "static"] as const;

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

function slotRootField(fieldPath: string): string {
  return fieldPath.includes(".") ? fieldPath.split(".")[0]! : fieldPath;
}

function isStaticTextItem(item: BuilderSlotItemDraft): boolean {
  return item.component === "text" && item.staticText !== undefined;
}

function isDateLayoutFieldPath(
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition: (name: string) => ReturnType<typeof tryGetEntityDefinition>,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed === "createdAt" || trimmed === "updatedAt") {
    return true;
  }

  return (
    resolveLayoutSlotDisplayMeta(trimmed, definition, getDefinition)
      .fieldType === "date"
  );
}

function defaultDateDisplayFormatForField(
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition: (name: string) => ReturnType<typeof tryGetEntityDefinition>,
): "date" | "datetime" | "time" {
  return (
    resolveLayoutSlotDisplayMeta(fieldPath, definition, getDefinition)
      .dateDisplayFormat ?? "datetime"
  );
}

export interface CardLayoutSlotItemFieldsLabels {
  readonly field: string;
  readonly fallbackFields: string;
  readonly fallbackField: (index: number) => string;
  readonly addFallbackField: string;
  readonly removeFallbackField: string;
  readonly component: string;
  readonly showLabel: string;
  readonly labelPosition: string;
  readonly labelAbove: string;
  readonly labelBelow: string;
  readonly badgeColorRules: string;
  readonly badgeMatchValue: string;
  readonly badgeMatchPlaceholder: string;
  readonly badgeColor: string;
  readonly addBadgeRule: string;
  readonly removeBadgeRule: string;
  readonly badgeVariantLabel: (variant: CardBadgeVariant) => string;
  readonly imageSize: string;
  readonly increaseImageSize: string;
  readonly decreaseImageSize: string;
  readonly textSize: string;
  readonly increaseTextSize: string;
  readonly decreaseTextSize: string;
  readonly textThin: string;
  readonly textBold: string;
  readonly textItalic: string;
  readonly textUnderline: string;
  readonly textSource: string;
  readonly textSourceField: string;
  readonly textSourceFreeText: string;
  readonly freeText: string;
  readonly textColor: string;
  readonly textColorLabel: (color: CardTextColor) => string;
  readonly itemHorizontalAlign: string;
  readonly alignSlotDefault: string;
  readonly alignLeft: string;
  readonly alignCenter: string;
  readonly alignRight: string;
  readonly spacing: string;
  readonly spacingHint: string;
  readonly marginX: string;
  readonly marginY: string;
  readonly marginTop: string;
  readonly marginBottom: string;
  readonly marginLeft: string;
  readonly marginRight: string;
  readonly padding: string;
}

export interface CardLayoutSlotItemFieldsProps {
  readonly item: BuilderSlotItemDraft;
  readonly definition: SerializableEntityDefinition;
  readonly fieldOptions: readonly string[];
  readonly dateFieldOptions: readonly string[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly defaultMetricDefinitionId: string;
  readonly getDefinition: (
    name: string,
  ) => ReturnType<typeof tryGetEntityDefinition>;
  readonly labels: CardLayoutSlotItemFieldsLabels;
  readonly onPatchItem: (patch: Partial<BuilderSlotItemDraft>) => void;
  readonly onMergeItem: (
    patch: Partial<BuilderSlotItemDraft>,
    remove?: readonly (keyof BuilderSlotItemDraft)[],
  ) => void;
  readonly onUpdateBadgeRules: (rules: readonly BadgeVariantRule[]) => void;
  readonly onUpdateSpacing: (
    field: LayoutSpacingKey,
    value: number | undefined,
  ) => void;
}

export function CardLayoutSlotItemFields({
  item,
  definition,
  fieldOptions,
  dateFieldOptions,
  metricDefinitions,
  defaultMetricDefinitionId,
  getDefinition,
  labels,
  onPatchItem,
  onMergeItem,
  onUpdateBadgeRules,
  onUpdateSpacing,
}: CardLayoutSlotItemFieldsProps) {
  const { t } = useTranslation("common");
  const rootField = slotRootField(item.fieldPath);
  const badgeRules = item.badgeVariantRules ?? [];
  const selectableFieldOptions =
    item.component === "date" ? dateFieldOptions : fieldOptions;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {labels.component}
          </span>
          <select
            className={SELECT_CLASS}
            value={item.component}
            onChange={(event) => {
              const component = event.target
                .value as CardSlotComponentType;
              const nextFieldPath =
                component === "date" &&
                !isDateLayoutFieldPath(
                  definition,
                  item.fieldPath,
                  getDefinition,
                )
                  ? (dateFieldOptions[0] ?? item.fieldPath)
                  : item.fieldPath;
              const removeFields: (keyof BuilderSlotItemDraft)[] = [];
              if (component !== "text") {
                removeFields.push("staticText", "textColor");
              }
              if (component === "metric-kpi") {
                removeFields.push("fallbackFieldPaths");
              }

              onMergeItem(
                {
                  component,
                  fieldPath: nextFieldPath,
                  ...(component === "image" && item.imageSize === undefined
                    ? { imageSize: DEFAULT_CARD_IMAGE_SIZE_PX }
                    : {}),
                  ...(component === "date"
                    ? {
                        dateDisplayFormat:
                          item.dateDisplayFormat ??
                          defaultDateDisplayFormatForField(
                            definition,
                            nextFieldPath,
                            getDefinition,
                          ),
                      }
                    : {}),
                  ...(component === "metric-kpi"
                    ? {
                        metricDefinitionId:
                          item.metricDefinitionId ?? defaultMetricDefinitionId,
                        groupBindings: item.groupBindings ?? {},
                        dimensionBindings: item.dimensionBindings ?? {},
                      }
                    : {}),
                },
                removeFields,
              );
            }}
          >
            {COMPONENT_OPTIONS.map((component) => (
              <option key={component} value={component}>
                {component}
              </option>
            ))}
          </select>
        </label>
        {item.component !== "metric-kpi" && !isStaticTextItem(item) ? (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {labels.field}
            </span>
            <select
              className={SELECT_CLASS}
              value={relationAliasFieldPath(definition, item.fieldPath)}
              onChange={(event) => {
                const nextFieldPath = event.target.value;
                onPatchItem({
                  fieldPath: nextFieldPath,
                  ...(item.component === "date"
                    ? {
                        dateDisplayFormat:
                          item.dateDisplayFormat ??
                          defaultDateDisplayFormatForField(
                            definition,
                            nextFieldPath,
                            getDefinition,
                          ),
                      }
                    : {}),
                });
              }}
            >
              {selectableFieldOptions.map((fieldPath) => (
                <option key={fieldPath} value={fieldPath}>
                  {formatFieldLabel(slotRootField(fieldPath), definition)}
                  {fieldPath.includes(".") ? ` (${fieldPath})` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {item.component !== "metric-kpi" && !isStaticTextItem(item) ? (
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs">
            {labels.fallbackFields}
          </span>
          {(item.fallbackFieldPaths ?? []).map((fallbackPath, fallbackIndex) => (
            <div
              key={`${item.itemId}-fallback-${fallbackIndex}`}
              className="grid grid-cols-[1fr_auto] items-end gap-2"
            >
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {labels.fallbackField(fallbackIndex + 1)}
                </span>
                <select
                  className={SELECT_CLASS}
                  value={relationAliasFieldPath(definition, fallbackPath)}
                  onChange={(event) => {
                    const nextPath = event.target.value;
                    const nextFallbacks = (item.fallbackFieldPaths ?? []).map(
                      (entry, index) =>
                        index === fallbackIndex ? nextPath : entry,
                    );
                    onPatchItem({ fallbackFieldPaths: nextFallbacks });
                  }}
                >
                  {selectableFieldOptions.map((fieldPath) => (
                    <option key={fieldPath} value={fieldPath}>
                      {formatFieldLabel(slotRootField(fieldPath), definition)}
                      {fieldPath.includes(".") ? ` (${fieldPath})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <IconButton
                label={labels.removeFallbackField}
                size="sm"
                onClick={() => {
                  const nextFallbacks = (item.fallbackFieldPaths ?? []).filter(
                    (_, index) => index !== fallbackIndex,
                  );
                  if (nextFallbacks.length === 0) {
                    onMergeItem({}, ["fallbackFieldPaths"]);
                    return;
                  }
                  onPatchItem({ fallbackFieldPaths: nextFallbacks });
                }}
              >
                <Trash2 className="text-destructive size-4" />
              </IconButton>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              const usedPaths = new Set([
                item.fieldPath,
                ...(item.fallbackFieldPaths ?? []),
              ]);
              const nextFallback =
                selectableFieldOptions.find(
                  (fieldPath) => !usedPaths.has(fieldPath),
                ) ?? selectableFieldOptions[0];
              if (!nextFallback) {
                return;
              }
              onPatchItem({
                fallbackFieldPaths: [
                  ...(item.fallbackFieldPaths ?? []),
                  nextFallback,
                ],
              });
            }}
          >
            {labels.addFallbackField}
          </Button>
        </div>
      ) : null}

      {item.component === "date" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("dataModels.dateDisplayFormat")}
          </span>
          <select
            className={SELECT_CLASS}
            value={item.dateDisplayFormat ?? "datetime"}
            onChange={(event) =>
              onPatchItem({
                dateDisplayFormat: event.target.value as
                  | "date"
                  | "datetime"
                  | "time",
              })
            }
          >
            <option value="date">
              {t("dataModels.dateDisplayFormats.date")}
            </option>
            <option value="datetime">
              {t("dataModels.dateDisplayFormats.datetime")}
            </option>
            <option value="time">
              {t("dataModels.dateDisplayFormats.time")}
            </option>
          </select>
        </label>
      ) : null}

      {item.component === "metric-kpi" &&
      item.metricDefinitionId &&
      metricDefinitions.find(
        (metric) => metric.id === item.metricDefinitionId,
      ) ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {t("entity.viewSettings.metrics.definition")}
            </span>
            <select
              className={SELECT_CLASS}
              value={item.metricDefinitionId}
              onChange={(event) =>
                onPatchItem({ metricDefinitionId: event.target.value })
              }
            >
              {metricDefinitions.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
          </label>
          <MetricBindingsEditor
            metric={
              metricDefinitions.find(
                (metric) => metric.id === item.metricDefinitionId,
              )!
            }
            bindings={{
              groupBindings: item.groupBindings ?? {},
              dimensionBindings: item.dimensionBindings ?? {},
            }}
            entityDefinition={definition}
            filterFieldOptions={fieldOptions}
            onChange={(bindings) => onPatchItem(bindings)}
          />
        </div>
      ) : null}

      {item.component === "image" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">
            {labels.imageSize}
          </span>
          <div className="flex items-center gap-2">
            <IconButton
              label={labels.decreaseImageSize}
              size="sm"
              disabled={
                clampCardImageSizePx(item.imageSize) <= MIN_CARD_IMAGE_SIZE_PX
              }
              onClick={() =>
                onPatchItem({
                  imageSize: stepCardImageSizeDown(item.imageSize),
                })
              }
            >
              <Minus className="size-4" />
            </IconButton>
            <Text className="w-10 text-center text-sm tabular-nums">
              {clampCardImageSizePx(item.imageSize)}
            </Text>
            <IconButton
              label={labels.increaseImageSize}
              size="sm"
              disabled={
                clampCardImageSizePx(item.imageSize) >= MAX_CARD_IMAGE_SIZE_PX
              }
              onClick={() =>
                onPatchItem({
                  imageSize: stepCardImageSizeUp(item.imageSize),
                })
              }
            >
              <Plus className="size-4" />
            </IconButton>
          </div>
        </div>
      ) : null}

      {item.component === "text" ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {labels.textSource}
            </span>
            <SegmentedSwitch
              value={isStaticTextItem(item) ? "static" : "field"}
              options={TEXT_SOURCE_OPTIONS.map((source) => ({
                value: source,
                label:
                  source === "field"
                    ? labels.textSourceField
                    : labels.textSourceFreeText,
                ariaLabel:
                  source === "field"
                    ? labels.textSourceField
                    : labels.textSourceFreeText,
              }))}
              onChange={(value) => {
                if (value === "static") {
                  onPatchItem({ staticText: item.staticText ?? "" });
                  return;
                }
                onMergeItem({}, ["staticText"]);
              }}
              ariaLabel={labels.textSource}
              fullWidth
            />
          </div>
          {isStaticTextItem(item) ? (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {labels.freeText}
              </span>
              <Input
                value={item.staticText ?? ""}
                onChange={(event) =>
                  onPatchItem({ staticText: event.target.value })
                }
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {labels.textColor}
            </span>
            <select
              className={SELECT_CLASS}
              value={item.textColor ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  onMergeItem({}, ["textColor"]);
                  return;
                }
                onPatchItem({ textColor: value as CardTextColor });
              }}
            >
              <option value="">{labels.textColorLabel("default")}</option>
              {CARD_TEXT_COLOR_OPTIONS.filter((color) => color !== "default").map(
                (color) => (
                  <option key={color} value={color}>
                    {labels.textColorLabel(color)}
                  </option>
                ),
              )}
            </select>
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              {labels.textSize}
            </span>
            <div className="flex items-center gap-2">
              <IconButton
                label={labels.decreaseTextSize}
                size="sm"
                disabled={
                  clampCardTextSizePx(item.textSize) <= MIN_CARD_TEXT_SIZE_PX
                }
                onClick={() =>
                  onPatchItem({
                    textSize: stepCardTextSizeDown(item.textSize),
                  })
                }
              >
                <Minus className="size-4" />
              </IconButton>
              <Text className="w-10 text-center text-sm tabular-nums">
                {clampCardTextSizePx(item.textSize)}
              </Text>
              <IconButton
                label={labels.increaseTextSize}
                size="sm"
                disabled={
                  clampCardTextSizePx(item.textSize) >= MAX_CARD_TEXT_SIZE_PX
                }
                onClick={() =>
                  onPatchItem({
                    textSize: stepCardTextSizeUp(item.textSize),
                  })
                }
              >
                <Plus className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={item.textThin ?? false}
              onChange={(event) => {
                if (event.target.checked) {
                  onPatchItem({ textThin: true, textBold: undefined });
                  return;
                }
                onMergeItem({}, ["textThin"]);
              }}
              label={labels.textThin}
              className="shrink-0"
            />
            <Checkbox
              checked={item.textBold ?? false}
              onChange={(event) => {
                if (event.target.checked) {
                  onPatchItem({ textBold: true, textThin: undefined });
                  return;
                }
                onMergeItem({}, ["textBold"]);
              }}
              label={labels.textBold}
              className="shrink-0"
            />
            <Checkbox
              checked={item.textItalic ?? false}
              onChange={(event) => {
                if (event.target.checked) {
                  onPatchItem({ textItalic: true });
                  return;
                }
                onMergeItem({}, ["textItalic"]);
              }}
              label={labels.textItalic}
              className="shrink-0"
            />
            <Checkbox
              checked={item.textUnderline ?? false}
              onChange={(event) => {
                if (event.target.checked) {
                  onPatchItem({ textUnderline: true });
                  return;
                }
                onMergeItem({}, ["textUnderline"]);
              }}
              label={labels.textUnderline}
              className="shrink-0"
            />
          </div>
        </>
      ) : null}

      {item.component === "badge" ? (
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs">
            {labels.badgeColorRules}
          </span>
          {badgeRules.map((rule, ruleIndex) => (
            <div
              key={`${item.itemId}-badge-rule-${ruleIndex}`}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
            >
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {labels.badgeMatchValue}
                </span>
                <Input
                  value={rule.matchValue}
                  placeholder={labels.badgeMatchPlaceholder}
                  onChange={(event) => {
                    const nextRules = badgeRules.map((entry, index) =>
                      index === ruleIndex
                        ? { ...entry, matchValue: event.target.value }
                        : entry,
                    );
                    onUpdateBadgeRules(nextRules);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {labels.badgeColor}
                </span>
                <select
                  className={SELECT_CLASS}
                  value={rule.variant}
                  onChange={(event) => {
                    const nextRules = badgeRules.map((entry, index) =>
                      index === ruleIndex
                        ? {
                            ...entry,
                            variant: event.target.value as CardBadgeVariant,
                          }
                        : entry,
                    );
                    onUpdateBadgeRules(nextRules);
                  }}
                >
                  {BADGE_COLOR_OPTIONS.map((variant) => (
                    <option key={variant} value={variant}>
                      {labels.badgeVariantLabel(variant)}
                    </option>
                  ))}
                </select>
              </label>
              <IconButton
                label={labels.removeBadgeRule}
                size="sm"
                onClick={() => {
                  onUpdateBadgeRules(
                    badgeRules.filter((_, index) => index !== ruleIndex),
                  );
                }}
              >
                <Trash2 className="text-destructive size-4" />
              </IconButton>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              onUpdateBadgeRules([
                ...badgeRules,
                { matchValue: "", variant: "default" },
              ]);
            }}
          >
            {labels.addBadgeRule}
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox
          checked={item.showLabel ?? false}
          onChange={(event) =>
            onPatchItem({ showLabel: event.target.checked })
          }
          label={labels.showLabel}
          className="shrink-0"
        />
        <Input
          className="min-w-0 flex-1"
          value={item.label ?? ""}
          placeholder={formatFieldLabel(rootField, definition)}
          onChange={(event) => onPatchItem({ label: event.target.value })}
        />
      </div>

      {item.showLabel &&
      (item.component === "text" ||
        item.component === "currency" ||
        item.component === "date") ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {labels.labelPosition}
          </span>
          <select
            className={SELECT_CLASS}
            value={item.labelPosition ?? "above"}
            onChange={(event) =>
              onPatchItem({
                labelPosition: event.target.value as "above" | "below",
              })
            }
          >
            <option value="above">{labels.labelAbove}</option>
            <option value="below">{labels.labelBelow}</option>
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {labels.itemHorizontalAlign}
        </span>
        <select
          className={SELECT_CLASS}
          value={item.align ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) {
              onMergeItem({}, ["align"]);
              return;
            }
            onPatchItem({ align: value as BuilderSlotHorizontalAlign });
          }}
        >
          <option value="">{labels.alignSlotDefault}</option>
          <option value="start">{labels.alignLeft}</option>
          <option value="center">{labels.alignCenter}</option>
          <option value="end">{labels.alignRight}</option>
        </select>
      </label>

      <CardLayoutItemSpacingFields
        item={item}
        labels={{
          spacing: labels.spacing,
          spacingHint: labels.spacingHint,
          marginX: labels.marginX,
          marginY: labels.marginY,
          marginTop: labels.marginTop,
          marginBottom: labels.marginBottom,
          marginLeft: labels.marginLeft,
          marginRight: labels.marginRight,
          padding: labels.padding,
        }}
        onChange={onUpdateSpacing}
      />
    </>
  );
}
