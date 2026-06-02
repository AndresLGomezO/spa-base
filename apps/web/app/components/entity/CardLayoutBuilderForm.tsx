import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CardBadgeVariant,
  CardSlotComponentType,
  SerializableEntityDefinition,
} from "@repo/entities";
import {
  listCardLayoutFieldOptions,
  relationAliasFieldPath,
} from "@repo/entities";
import { cn } from "@repo/theme/utils";
import {
  Button,
  Checkbox,
  clampCardImageSizePx,
  clampCardTextSizePx,
  DEFAULT_CARD_IMAGE_SIZE_PX,
  IconButton,
  Input,
  LayoutCard,
  LayoutRenderer,
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
  type SegmentedSwitchOption,
} from "@repo/ui";
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  allocateSlotId,
  buildLayoutFromBuilderSlots,
  defaultSlotAlignForColumn,
  normalizeSlotsForColumnCount,
  type BadgeVariantRule,
  type BuilderSlotDraft,
  type BuilderSlotHorizontalAlign,
  type BuilderSlotVerticalAlign,
} from "./card-layout-builder-state";
import {
  clampCardsPerRow,
  MAX_CARDS_PER_ROW,
  MIN_CARDS_PER_ROW,
} from "./entity-card-list-grid";
import {
  formatFieldLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useQuery } from "@tanstack/react-query";

import { usePermission } from "../../auth/usePermission.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import { MetricBindingsEditor } from "../metrics/MetricBindingsEditor.js";
import { renderEntityLayoutSlotPreview } from "./render-entity-layout-slot-preview.js";

function withoutSlotField<K extends keyof BuilderSlotDraft>(
  slot: BuilderSlotDraft,
  field: K,
): Omit<BuilderSlotDraft, K> {
  const { [field]: dropped, ...rest } = slot;
  void dropped;
  return rest;
}

const COMPONENT_OPTIONS: readonly CardSlotComponentType[] = [
  "text",
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

interface CardLayoutBuilderFormProps {
  readonly className?: string;
  readonly definition: SerializableEntityDefinition;
  readonly slots: readonly BuilderSlotDraft[];
  readonly columns: number;
  readonly cardsPerRow: number;
  readonly showActions: boolean;
  readonly previewItem: Record<string, unknown> | null;
  readonly onSlotsChange: (slots: readonly BuilderSlotDraft[]) => void;
  readonly onColumnsChange: (columns: number) => void;
  readonly onCardsPerRowChange: (cardsPerRow: number) => void;
  readonly onShowActionsChange: (showActions: boolean) => void;
  readonly labels: {
    readonly structure: string;
    readonly slotSettings: string;
    readonly preview: string;
    readonly field: string;
    readonly component: string;
    readonly showLabel: string;
    readonly label: string;
    readonly addSlot: string;
    readonly showActions: string;
    readonly layoutColumns: string;
    readonly cardsPerRow: string;
    readonly cardsPerRowHint: string;
    readonly columnTabs: string;
    readonly columnTab: (column: number) => string;
    readonly emptyColumn: string;
    readonly slotTitle: (index: number) => string;
    readonly moveSlotUp: string;
    readonly moveSlotDown: string;
    readonly deleteSlot: string;
    readonly horizontalAlign: string;
    readonly verticalAlign: string;
    readonly alignLeft: string;
    readonly alignCenter: string;
    readonly alignRight: string;
    readonly alignTop: string;
    readonly alignMiddle: string;
    readonly alignBottom: string;
    readonly alignDefault: string;
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
  };
}

const VERTICAL_ALIGN_OPTIONS: readonly BuilderSlotVerticalAlign[] = [
  "start",
  "center",
  "end",
];

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

function slotRootField(fieldPath: string): string {
  return fieldPath.includes(".") ? fieldPath.split(".")[0]! : fieldPath;
}

export function CardLayoutBuilderForm({
  className,
  definition,
  slots,
  columns,
  cardsPerRow,
  showActions,
  previewItem,
  onSlotsChange,
  onColumnsChange,
  onCardsPerRowChange,
  onShowActionsChange,
  labels,
}: CardLayoutBuilderFormProps) {
  const { t } = useTranslation("common");
  const { items: catalogItems } = useEntityCatalog();
  const getDefinition = useCallback(
    (name: string) => tryGetEntityDefinition(name, catalogItems),
    [catalogItems],
  );
  const [activeColumn, setActiveColumn] = useState(0);

  useEffect(() => {
    if (activeColumn >= columns) {
      setActiveColumn(Math.max(0, columns - 1));
    }
  }, [activeColumn, columns]);

  const fieldOptions = useMemo(
    () => listCardLayoutFieldOptions(definition),
    [definition],
  );
  const canReadMetrics = usePermission("metricValue.read");
  const metricDefinitionsQuery = useQuery({
    queryKey: ["metric-definitions", "active"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: canReadMetrics,
  });
  const metricDefinitions = metricDefinitionsQuery.data ?? [];
  const defaultMetricDefinitionId = metricDefinitions[0]?.id ?? "";

  const layout = useMemo(
    () =>
      buildLayoutFromBuilderSlots(slots, { columns, showActions, cardsPerRow }),
    [cardsPerRow, columns, showActions, slots],
  );

  const columnTabOptions = useMemo(
    (): readonly SegmentedSwitchOption<string>[] =>
      Array.from({ length: columns }, (_, index) => ({
        value: String(index),
        label: String(index + 1),
        ariaLabel: labels.columnTab(index + 1),
      })),
    [columns, labels],
  );

  const columnSlots = useMemo(
    () =>
      [...slots]
        .filter((slot) => slot.column === activeColumn)
        .sort((left, right) => left.order - right.order),
    [activeColumn, slots],
  );

  const handleColumnsChange = (nextColumns: number): void => {
    if (Number.isNaN(nextColumns) || nextColumns < 1 || nextColumns > 6) {
      return;
    }

    onSlotsChange(normalizeSlotsForColumnCount(slots, nextColumns));
    onColumnsChange(nextColumns);

    if (activeColumn >= nextColumns) {
      setActiveColumn(nextColumns - 1);
    }
  };

  const updateSlot = (
    slotId: string,
    patch: Partial<BuilderSlotDraft>,
  ): void => {
    onSlotsChange(
      slots.map((slot) =>
        slot.slotId === slotId ? { ...slot, ...patch } : slot,
      ),
    );
  };

  const updateBadgeRules = (
    slotId: string,
    rules: readonly BadgeVariantRule[],
  ): void => {
    onSlotsChange(
      slots.map((slot) => {
        if (slot.slotId !== slotId) {
          return slot;
        }
        if (rules.length === 0) {
          return withoutSlotField(slot, "badgeVariantRules");
        }
        return { ...slot, badgeVariantRules: rules };
      }),
    );
  };

  const addSlot = (): void => {
    const defaultField = fieldOptions[0] ?? "name";
    onSlotsChange([
      ...slots,
      {
        slotId: allocateSlotId(slots),
        fieldPath: defaultField,
        component: "text",
        column: activeColumn,
        order: columnSlots.length,
        align: defaultSlotAlignForColumn(activeColumn, columns),
        showLabel: true,
      },
    ]);
  };

  const removeSlot = (slotId: string): void => {
    const remaining = slots.filter((slot) => slot.slotId !== slotId);
    onSlotsChange(normalizeSlotsForColumnCount(remaining, columns));
  };

  const moveSlotInColumn = (slotId: string, direction: "up" | "down"): void => {
    const index = columnSlots.findIndex((slot) => slot.slotId === slotId);
    if (index === -1) {
      return;
    }
    if (direction === "up" && index === 0) {
      return;
    }
    if (direction === "down" && index === columnSlots.length - 1) {
      return;
    }

    const reordered = [...columnSlots];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex]!,
      reordered[index]!,
    ];

    const orderBySlotId = new Map(
      reordered.map((slot, order) => [slot.slotId, order] as const),
    );

    onSlotsChange(
      slots.map((slot) =>
        slot.column !== activeColumn
          ? slot
          : { ...slot, order: orderBySlotId.get(slot.slotId) ?? slot.order },
      ),
    );
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <div className="bg-popover shrink-0">
        <Text className="mb-3 font-semibold">{labels.preview}</Text>
        {previewItem ? (
          <LayoutCard actions={showActions ? <span /> : null}>
            <LayoutRenderer
              layout={layout}
              renderSlot={(_slotId, binding) =>
                binding
                  ? renderEntityLayoutSlotPreview({
                      item: previewItem,
                      binding,
                      definition,
                      locale: "en",
                      getDefinition,
                    })
                  : null
              }
            />
          </LayoutCard>
        ) : (
          <Text variant="muted">No records to preview yet.</Text>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <label className="text-muted-foreground text-sm">
              {labels.cardsPerRow}
            </label>
            <Input
              type="number"
              min={MIN_CARDS_PER_ROW}
              max={MAX_CARDS_PER_ROW}
              value={String(cardsPerRow)}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(next)) {
                  return;
                }
                onCardsPerRowChange(clampCardsPerRow(next));
              }}
              className="w-20"
            />
          </div>
          <Text variant="muted" className="text-xs">
            {labels.cardsPerRowHint}
          </Text>
        </div>

        <Text className="shrink-0 font-semibold">{labels.structure}</Text>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-4 pr-1">
            <div className="flex items-center gap-3">
              <label className="text-muted-foreground text-sm">
                {labels.layoutColumns}
              </label>
              <Input
                type="number"
                min={1}
                max={6}
                value={String(columns)}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  handleColumnsChange(next);
                }}
                className="w-20"
              />
            </div>

            {columns > 0 ? (
              <SegmentedSwitch
                value={String(activeColumn)}
                options={columnTabOptions}
                onChange={(value) => {
                  const next = Number.parseInt(value, 10);
                  if (!Number.isNaN(next)) {
                    setActiveColumn(next);
                  }
                }}
                ariaLabel={labels.columnTabs}
                fullWidth
              />
            ) : null}

            <Checkbox
              checked={showActions}
              onChange={(event) => onShowActionsChange(event.target.checked)}
              label={labels.showActions}
            />

            <div className="flex flex-col gap-3">
              {columnSlots.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {labels.emptyColumn}
                </Text>
              ) : null}

              {columnSlots.map((slot, columnIndex) => {
                const rootField = slotRootField(slot.fieldPath);
                const badgeRules = slot.badgeVariantRules ?? [];

                return (
                  <div
                    key={slot.slotId}
                    className="border-border flex flex-col gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Text className="text-sm font-medium">
                        {labels.slotTitle(columnIndex + 1)}
                      </Text>
                      <div className="flex items-center gap-1">
                        {columnIndex > 0 ? (
                          <IconButton
                            label={labels.moveSlotUp}
                            size="sm"
                            onClick={() => moveSlotInColumn(slot.slotId, "up")}
                          >
                            <ArrowUp className="size-4" />
                          </IconButton>
                        ) : null}
                        <IconButton
                          label={labels.deleteSlot}
                          size="sm"
                          onClick={() => removeSlot(slot.slotId)}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </IconButton>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                          {labels.component}
                        </span>
                        <select
                          className={SELECT_CLASS}
                          value={slot.component}
                          onChange={(event) => {
                            const component = event.target
                              .value as CardSlotComponentType;
                            updateSlot(slot.slotId, {
                              component,
                              ...(component === "image" &&
                              slot.imageSize === undefined
                                ? { imageSize: DEFAULT_CARD_IMAGE_SIZE_PX }
                                : {}),
                              ...(component === "metric-kpi"
                                ? {
                                    metricDefinitionId:
                                      slot.metricDefinitionId ??
                                      defaultMetricDefinitionId,
                                    groupBindings: slot.groupBindings ?? {},
                                    dimensionBindings:
                                      slot.dimensionBindings ?? {},
                                  }
                                : {}),
                            });
                          }}
                        >
                          {COMPONENT_OPTIONS.map((component) => (
                            <option key={component} value={component}>
                              {component}
                            </option>
                          ))}
                        </select>
                      </label>
                      {slot.component !== "metric-kpi" ? (
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-xs">
                            {labels.field}
                          </span>
                          <select
                            className={SELECT_CLASS}
                            value={relationAliasFieldPath(
                              definition,
                              slot.fieldPath,
                            )}
                            onChange={(event) =>
                              updateSlot(slot.slotId, {
                                fieldPath: event.target.value,
                              })
                            }
                          >
                            {fieldOptions.map((fieldPath) => (
                              <option key={fieldPath} value={fieldPath}>
                                {formatFieldLabel(
                                  slotRootField(fieldPath),
                                  definition,
                                )}
                                {fieldPath.includes(".")
                                  ? ` (${fieldPath})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>

                    {slot.component === "metric-kpi" &&
                    slot.metricDefinitionId &&
                    metricDefinitions.find(
                      (item) => item.id === slot.metricDefinitionId,
                    ) ? (
                      <div className="flex flex-col gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-xs">
                            {t("entity.viewSettings.metrics.definition")}
                          </span>
                          <select
                            className={SELECT_CLASS}
                            value={slot.metricDefinitionId}
                            onChange={(event) =>
                              updateSlot(slot.slotId, {
                                metricDefinitionId: event.target.value,
                              })
                            }
                          >
                            {metricDefinitions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <MetricBindingsEditor
                          metric={
                            metricDefinitions.find(
                              (item) => item.id === slot.metricDefinitionId,
                            )!
                          }
                          bindings={{
                            groupBindings: slot.groupBindings ?? {},
                            dimensionBindings: slot.dimensionBindings ?? {},
                          }}
                          entityDefinition={definition}
                          filterFieldOptions={fieldOptions}
                          onChange={(bindings) =>
                            updateSlot(slot.slotId, bindings)
                          }
                        />
                      </div>
                    ) : null}

                    {slot.component === "image" ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs">
                          {labels.imageSize}
                        </span>
                        <div className="flex items-center gap-2">
                          <IconButton
                            label={labels.decreaseImageSize}
                            size="sm"
                            disabled={
                              clampCardImageSizePx(slot.imageSize) <=
                              MIN_CARD_IMAGE_SIZE_PX
                            }
                            onClick={() =>
                              updateSlot(slot.slotId, {
                                imageSize: stepCardImageSizeDown(
                                  slot.imageSize,
                                ),
                              })
                            }
                          >
                            <Minus className="size-4" />
                          </IconButton>
                          <Text className="w-10 text-center text-sm tabular-nums">
                            {clampCardImageSizePx(slot.imageSize)}
                          </Text>
                          <IconButton
                            label={labels.increaseImageSize}
                            size="sm"
                            disabled={
                              clampCardImageSizePx(slot.imageSize) >=
                              MAX_CARD_IMAGE_SIZE_PX
                            }
                            onClick={() =>
                              updateSlot(slot.slotId, {
                                imageSize: stepCardImageSizeUp(slot.imageSize),
                              })
                            }
                          >
                            <Plus className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                    ) : null}

                    {slot.component === "text" ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-xs">
                            {labels.textSize}
                          </span>
                          <div className="flex items-center gap-2">
                            <IconButton
                              label={labels.decreaseTextSize}
                              size="sm"
                              disabled={
                                clampCardTextSizePx(slot.textSize) <=
                                MIN_CARD_TEXT_SIZE_PX
                              }
                              onClick={() =>
                                updateSlot(slot.slotId, {
                                  textSize: stepCardTextSizeDown(slot.textSize),
                                })
                              }
                            >
                              <Minus className="size-4" />
                            </IconButton>
                            <Text className="w-10 text-center text-sm tabular-nums">
                              {clampCardTextSizePx(slot.textSize)}
                            </Text>
                            <IconButton
                              label={labels.increaseTextSize}
                              size="sm"
                              disabled={
                                clampCardTextSizePx(slot.textSize) >=
                                MAX_CARD_TEXT_SIZE_PX
                              }
                              onClick={() =>
                                updateSlot(slot.slotId, {
                                  textSize: stepCardTextSizeUp(slot.textSize),
                                })
                              }
                            >
                              <Plus className="size-4" />
                            </IconButton>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <Checkbox
                            checked={slot.textThin ?? false}
                            onChange={(event) => {
                              if (event.target.checked) {
                                onSlotsChange(
                                  slots.map((entry) => {
                                    if (entry.slotId !== slot.slotId) {
                                      return entry;
                                    }
                                    return {
                                      ...withoutSlotField(entry, "textBold"),
                                      textThin: true,
                                    };
                                  }),
                                );
                                return;
                              }
                              onSlotsChange(
                                slots.map((entry) => {
                                  if (entry.slotId !== slot.slotId) {
                                    return entry;
                                  }
                                  return withoutSlotField(entry, "textThin");
                                }),
                              );
                            }}
                            label={labels.textThin}
                            className="shrink-0"
                          />
                          <Checkbox
                            checked={slot.textBold ?? false}
                            onChange={(event) => {
                              if (event.target.checked) {
                                onSlotsChange(
                                  slots.map((entry) => {
                                    if (entry.slotId !== slot.slotId) {
                                      return entry;
                                    }
                                    return {
                                      ...withoutSlotField(entry, "textThin"),
                                      textBold: true,
                                    };
                                  }),
                                );
                                return;
                              }
                              onSlotsChange(
                                slots.map((entry) => {
                                  if (entry.slotId !== slot.slotId) {
                                    return entry;
                                  }
                                  return withoutSlotField(entry, "textBold");
                                }),
                              );
                            }}
                            label={labels.textBold}
                            className="shrink-0"
                          />
                          <Checkbox
                            checked={slot.textItalic ?? false}
                            onChange={(event) => {
                              if (event.target.checked) {
                                updateSlot(slot.slotId, { textItalic: true });
                                return;
                              }
                              onSlotsChange(
                                slots.map((entry) => {
                                  if (entry.slotId !== slot.slotId) {
                                    return entry;
                                  }
                                  return withoutSlotField(entry, "textItalic");
                                }),
                              );
                            }}
                            label={labels.textItalic}
                            className="shrink-0"
                          />
                          <Checkbox
                            checked={slot.textUnderline ?? false}
                            onChange={(event) => {
                              if (event.target.checked) {
                                updateSlot(slot.slotId, {
                                  textUnderline: true,
                                });
                                return;
                              }
                              onSlotsChange(
                                slots.map((entry) => {
                                  if (entry.slotId !== slot.slotId) {
                                    return entry;
                                  }
                                  return withoutSlotField(
                                    entry,
                                    "textUnderline",
                                  );
                                }),
                              );
                            }}
                            label={labels.textUnderline}
                            className="shrink-0"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                          {labels.horizontalAlign}
                        </span>
                        <select
                          className={SELECT_CLASS}
                          value={
                            slot.align ??
                            defaultSlotAlignForColumn(activeColumn, columns)
                          }
                          onChange={(event) =>
                            updateSlot(slot.slotId, {
                              align: event.target
                                .value as BuilderSlotHorizontalAlign,
                            })
                          }
                        >
                          <option value="start">{labels.alignLeft}</option>
                          <option value="center">{labels.alignCenter}</option>
                          <option value="end">{labels.alignRight}</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                          {labels.verticalAlign}
                        </span>
                        <select
                          className={SELECT_CLASS}
                          value={slot.justify ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (!value) {
                              onSlotsChange(
                                slots.map((entry) => {
                                  if (entry.slotId !== slot.slotId) {
                                    return entry;
                                  }
                                  return withoutSlotField(entry, "justify");
                                }),
                              );
                              return;
                            }
                            updateSlot(slot.slotId, {
                              justify: value as BuilderSlotVerticalAlign,
                            });
                          }}
                        >
                          <option value="">{labels.alignDefault}</option>
                          {VERTICAL_ALIGN_OPTIONS.map((align) => (
                            <option key={align} value={align}>
                              {align === "start"
                                ? labels.alignTop
                                : align === "center"
                                  ? labels.alignMiddle
                                  : labels.alignBottom}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {slot.component === "badge" ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-muted-foreground text-xs">
                          {labels.badgeColorRules}
                        </span>
                        {badgeRules.map((rule, ruleIndex) => (
                          <div
                            key={`${slot.slotId}-badge-rule-${ruleIndex}`}
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
                                  const nextRules = badgeRules.map(
                                    (entry, index) =>
                                      index === ruleIndex
                                        ? {
                                            ...entry,
                                            matchValue: event.target.value,
                                          }
                                        : entry,
                                  );
                                  updateBadgeRules(slot.slotId, nextRules);
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
                                  const nextRules = badgeRules.map(
                                    (entry, index) =>
                                      index === ruleIndex
                                        ? {
                                            ...entry,
                                            variant: event.target
                                              .value as CardBadgeVariant,
                                          }
                                        : entry,
                                  );
                                  updateBadgeRules(slot.slotId, nextRules);
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
                                updateBadgeRules(
                                  slot.slotId,
                                  badgeRules.filter(
                                    (_, index) => index !== ruleIndex,
                                  ),
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
                            updateBadgeRules(slot.slotId, [
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
                        checked={slot.showLabel ?? false}
                        onChange={(event) =>
                          updateSlot(slot.slotId, {
                            showLabel: event.target.checked,
                          })
                        }
                        label={labels.showLabel}
                        className="shrink-0"
                      />
                      <Input
                        className="min-w-0 flex-1"
                        value={slot.label ?? ""}
                        placeholder={formatFieldLabel(rootField, definition)}
                        onChange={(event) =>
                          updateSlot(slot.slotId, {
                            label: event.target.value,
                          })
                        }
                      />
                    </div>

                    {columnIndex < columnSlots.length - 1 ? (
                      <div className="flex justify-end">
                        <IconButton
                          label={labels.moveSlotDown}
                          size="sm"
                          onClick={() => moveSlotInColumn(slot.slotId, "down")}
                        >
                          <ArrowDown className="size-4" />
                        </IconButton>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" onClick={addSlot}>
              {labels.addSlot}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
