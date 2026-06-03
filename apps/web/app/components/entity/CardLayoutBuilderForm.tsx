import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LayoutSpacingKey,
  SerializableEntityDefinition,
  CardBadgeVariant,
  CardTextColor,
} from "@repo/entities";
import { listCardLayoutFieldOptions } from "@repo/entities";
import { cn } from "@repo/theme/utils";
import {
  Button,
  Checkbox,
  IconButton,
  Input,
  LayoutCard,
  LayoutRenderer,
  SegmentedSwitch,
  Text,
  type LayoutColumnHighlight,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import {
  allocateItemId,
  allocateSlotId,
  buildLayoutFromBuilderSlots,
  defaultSlotAlignForColumn,
  getItemChildren,
  getItemInnerColumns,
  getSlotInnerColumns,
  getSlotItems,
  isItemGroup,
  mapSlotItemTree,
  normalizeItemInnerColumnCount,
  normalizeSlotInnerColumnCount,
  normalizeSlotsForColumnCount,
  removeSlotItemFromTree,
  collectSlotTreeItemIds,
  swapBuilderColumns,
  removeBuilderColumn,
  swapItemInnerColumns,
  swapSlotInnerColumns,
  type BadgeVariantRule,
  type BuilderSlotDraft,
  type BuilderSlotItemDraft,
  type BuilderSlotHorizontalAlign,
  type BuilderSlotVerticalAlign,
} from "./card-layout-builder-state";
import {
  CardLayoutSlotItemFields,
  type CardLayoutSlotItemFieldsLabels,
} from "./CardLayoutSlotItemFields.js";
import {
  clampCardsPerRow,
  MAX_CARDS_PER_ROW,
  MIN_CARDS_PER_ROW,
} from "./entity-card-list-grid";
import {
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useQuery } from "@tanstack/react-query";

import { usePermission } from "../../auth/usePermission.js";
import { listMetricDefinitions } from "../../lib/api-client.js";
import { renderEntityLayoutSlotPreview } from "./render-entity-layout-slot-preview.js";
import { resolveLayoutSlotDisplayMeta } from "./resolve-layout-slot-display.js";

function withoutItemField<K extends keyof BuilderSlotItemDraft>(
  item: BuilderSlotItemDraft,
  field: K,
): Omit<BuilderSlotItemDraft, K> {
  const { [field]: dropped, ...rest } = item;
  void dropped;
  return rest;
}

function mergeSlotItemPatch(
  item: BuilderSlotItemDraft,
  patch: Partial<BuilderSlotItemDraft>,
  remove: readonly (keyof BuilderSlotItemDraft)[] = [],
): BuilderSlotItemDraft {
  let next: BuilderSlotItemDraft = { ...item, ...patch };
  for (const field of remove) {
    next = withoutItemField(next, field);
  }
  return next;
}

function withoutSlotField<K extends keyof BuilderSlotDraft>(
  slot: BuilderSlotDraft,
  field: K,
): Omit<BuilderSlotDraft, K> {
  const { [field]: dropped, ...rest } = slot;
  void dropped;
  return rest;
}

const VERTICAL_ALIGN_OPTIONS: readonly BuilderSlotVerticalAlign[] = [
  "start",
  "center",
  "end",
];

const SELECT_CLASS =
  "border-border bg-background w-full rounded-md border px-2 py-1 text-sm";

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
    readonly fallbackFields: string;
    readonly fallbackField: (index: number) => string;
    readonly addFallbackField: string;
    readonly removeFallbackField: string;
    readonly component: string;
    readonly showLabel: string;
    readonly labelPosition: string;
    readonly labelAbove: string;
    readonly labelBelow: string;
    readonly label: string;
    readonly addSlot: string;
    readonly addInnerItem: string;
    readonly showActions: string;
    readonly layoutColumns: string;
    readonly slotColumns: string;
    readonly cardsPerRow: string;
    readonly cardsPerRowHint: string;
    readonly columnTabs: string;
    readonly columnTab: (column: number) => string;
    readonly emptyColumn: string;
    readonly slotTitle: (index: number) => string;
    readonly expandSlot: string;
    readonly collapseSlot: string;
    readonly moveSlotUp: string;
    readonly moveSlotDown: string;
    readonly moveColumnLeft: string;
    readonly moveColumnRight: string;
    readonly deleteColumn: (column: number) => string;
    readonly deleteSlot: string;
    readonly horizontalAlign: string;
    readonly itemHorizontalAlign: string;
    readonly alignSlotDefault: string;
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
    readonly textSource: string;
    readonly textSourceField: string;
    readonly textSourceFreeText: string;
    readonly freeText: string;
    readonly textColor: string;
    readonly textColorLabel: (color: CardTextColor) => string;
    readonly spacing: string;
    readonly spacingHint: string;
    readonly marginX: string;
    readonly marginY: string;
    readonly marginTop: string;
    readonly marginBottom: string;
    readonly marginLeft: string;
    readonly marginRight: string;
    readonly padding: string;
  };
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

function findSlotItemById(
  items: readonly BuilderSlotItemDraft[],
  itemId: string,
): BuilderSlotItemDraft | undefined {
  for (const item of items) {
    if (item.itemId === itemId) {
      return item;
    }

    if (item.items) {
      const nested = findSlotItemById(item.items, itemId);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
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
  const { items: catalogItems } = useEntityCatalog();
  const getDefinition = useCallback(
    (name: string) => tryGetEntityDefinition(name, catalogItems),
    [catalogItems],
  );
  const [activeColumn, setActiveColumn] = useState(0);
  const [activeInnerColumnBySlotId, setActiveInnerColumnBySlotId] = useState<
    Record<string, number>
  >({});
  const [activeInnerColumnByItemId, setActiveInnerColumnByItemId] = useState<
    Record<string, number>
  >({});
  const [collapsedSlotIds, setCollapsedSlotIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [collapsedItemIds, setCollapsedItemIds] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const toggleSlotCollapsed = (slotId: string): void => {
    setCollapsedSlotIds((current) => {
      const next = new Set(current);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };

  const toggleItemCollapsed = (itemId: string): void => {
    setCollapsedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const removeCollapsedItemIds = (itemIds: readonly string[]): void => {
    if (itemIds.length === 0) {
      return;
    }
    setCollapsedItemIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const itemId of itemIds) {
        if (next.delete(itemId)) {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  };

  useEffect(() => {
    if (activeColumn >= columns) {
      setActiveColumn(Math.max(0, columns - 1));
    }
  }, [activeColumn, columns]);

  const fieldOptions = useMemo(
    () => listCardLayoutFieldOptions(definition),
    [definition],
  );
  const dateFieldOptions = useMemo(
    () =>
      fieldOptions.filter((fieldPath) =>
        isDateLayoutFieldPath(definition, fieldPath, getDefinition),
      ),
    [definition, fieldOptions, getDefinition],
  );
  const canListMetricDefinitions = usePermission("metricDefinition.read");
  const metricDefinitionsQuery = useQuery({
    queryKey: ["metric-definitions", "active"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: canListMetricDefinitions,
  });
  const metricDefinitions = metricDefinitionsQuery.data ?? [];
  const defaultMetricDefinitionId = metricDefinitions[0]?.id ?? "";

  const layout = useMemo(
    () =>
      buildLayoutFromBuilderSlots(slots, { columns, showActions, cardsPerRow }),
    [cardsPerRow, columns, showActions, slots],
  );

  const previewColumnHighlights = useMemo((): readonly LayoutColumnHighlight[] => {
    const highlights: LayoutColumnHighlight[] = [
      { depth: 0, columnIndex: activeColumn },
    ];

    const appendItemHighlights = (items: readonly BuilderSlotItemDraft[]): void => {
      for (const item of items) {
        if (getItemInnerColumns(item) > 1) {
          highlights.push({
            depth: 2,
            gridId: item.itemId,
            columnIndex: activeInnerColumnByItemId[item.itemId] ?? 0,
          });
        }

        if (item.items?.length) {
          appendItemHighlights(item.items);
        }
      }
    };

    for (const slot of slots) {
      if (slot.column !== activeColumn) {
        continue;
      }

      if (getSlotInnerColumns(slot) > 1) {
        highlights.push({
          depth: 1,
          gridId: slot.slotId,
          columnIndex: activeInnerColumnBySlotId[slot.slotId] ?? 0,
        });
      }

      appendItemHighlights(getSlotItems(slot));
    }

    return highlights;
  }, [
    activeColumn,
    activeInnerColumnByItemId,
    activeInnerColumnBySlotId,
    slots,
  ]);

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

  const updateSlotGroup = (
    slotId: string,
    patch: Partial<Pick<BuilderSlotDraft, "align" | "justify" | "innerColumns">>,
  ): void => {
    onSlotsChange(
      slots.map((slot) =>
        slot.slotId === slotId ? { ...slot, ...patch } : slot,
      ),
    );
  };

  const updateSlotItem = (
    slotId: string,
    itemId: string,
    patch: Partial<BuilderSlotItemDraft>,
  ): void => {
    onSlotsChange(
      slots.map((slot) => {
        if (slot.slotId !== slotId) {
          return slot;
        }

        const items = mapSlotItemTree(getSlotItems(slot), itemId, (entry) => ({
          ...entry,
          ...patch,
        }));

        return normalizeSlotInnerColumnCount(
          { ...slot, items },
          getSlotInnerColumns(slot),
        );
      }),
    );
  };

  const updateItemSpacing = (
    slotId: string,
    itemId: string,
    field: LayoutSpacingKey,
    value: number | undefined,
  ): void => {
    if (value === undefined) {
      onSlotsChange(
        slots.map((slot) => {
          if (slot.slotId !== slotId) {
            return slot;
          }

          const items = mapSlotItemTree(getSlotItems(slot), itemId, (entry) =>
            withoutItemField(entry, field),
          );

          return normalizeSlotInnerColumnCount(
            { ...slot, items },
            getSlotInnerColumns(slot),
          );
        }),
      );
      return;
    }

    updateSlotItem(slotId, itemId, { [field]: value });
  };

  const mergeSlotItemFields = (
    slotId: string,
    itemId: string,
    patch: Partial<BuilderSlotItemDraft>,
    remove: readonly (keyof BuilderSlotItemDraft)[] = [],
  ): void => {
    onSlotsChange(
      slots.map((slot) => {
        if (slot.slotId !== slotId) {
          return slot;
        }

        const items = mapSlotItemTree(getSlotItems(slot), itemId, (entry) =>
          mergeSlotItemPatch(entry, patch, remove),
        );

        return normalizeSlotInnerColumnCount(
          { ...slot, items },
          getSlotInnerColumns(slot),
        );
      }),
    );
  };

  const slotItemFieldLabels: CardLayoutSlotItemFieldsLabels = labels;

  const slotItemFieldProps = (
    slotId: string,
    item: BuilderSlotItemDraft,
  ) => ({
    item,
    definition,
    fieldOptions,
    dateFieldOptions,
    metricDefinitions,
    defaultMetricDefinitionId,
    getDefinition,
    labels: slotItemFieldLabels,
    onPatchItem: (patch: Partial<BuilderSlotItemDraft>) =>
      updateSlotItem(slotId, item.itemId, patch),
    onMergeItem: (
      patch: Partial<BuilderSlotItemDraft>,
      remove: readonly (keyof BuilderSlotItemDraft)[] = [],
    ) => mergeSlotItemFields(slotId, item.itemId, patch, remove),
    onUpdateBadgeRules: (rules: readonly BadgeVariantRule[]) =>
      updateBadgeRules(slotId, item.itemId, rules),
    onUpdateSpacing: (field: LayoutSpacingKey, value: number | undefined) =>
      updateItemSpacing(slotId, item.itemId, field, value),
  });

  const updateSlot = (
    slotId: string,
    patch: Partial<BuilderSlotDraft>,
  ): void => {
    if (patch.align !== undefined) {
      updateSlotGroup(slotId, { align: patch.align });
    }
    if (patch.justify !== undefined) {
      updateSlotGroup(slotId, { justify: patch.justify });
    }

    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const item = getSlotItems(slot)[0];
    if (!item) {
      return;
    }

    const {
      align: _align,
      justify: _justify,
      innerColumns: _innerColumns,
      slotId: _slotId,
      column: _column,
      order: _order,
      items: _items,
      ...itemPatch
    } = patch;

    if (Object.keys(itemPatch).length > 0) {
      updateSlotItem(slotId, item.itemId, itemPatch);
    }
  };

  const updateBadgeRules = (
    slotId: string,
    itemId: string,
    rules: readonly BadgeVariantRule[],
  ): void => {
    onSlotsChange(
      slots.map((slot) => {
        if (slot.slotId !== slotId) {
          return slot;
        }

        const items = mapSlotItemTree(getSlotItems(slot), itemId, (entry) => {
          if (rules.length === 0) {
            return withoutItemField(entry, "badgeVariantRules");
          }
          return { ...entry, badgeVariantRules: rules };
        });

        return normalizeSlotInnerColumnCount(
          { ...slot, items },
          getSlotInnerColumns(slot),
        );
      }),
    );
  };

  const handleSlotInnerColumnsChange = (
    slotId: string,
    nextInnerColumns: number,
  ): void => {
    if (Number.isNaN(nextInnerColumns) || nextInnerColumns < 1 || nextInnerColumns > 6) {
      return;
    }

    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    onSlotsChange(
      slots.map((entry) =>
        entry.slotId === slotId
          ? normalizeSlotInnerColumnCount(entry, nextInnerColumns)
          : entry,
      ),
    );

    const activeInner = activeInnerColumnBySlotId[slotId] ?? 0;
    if (activeInner >= nextInnerColumns) {
      setActiveInnerColumnBySlotId((current) => ({
        ...current,
        [slotId]: nextInnerColumns - 1,
      }));
    }
  };

  const moveActiveInnerColumn = (
    slotId: string,
    direction: "left" | "right",
  ): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const innerColumns = getSlotInnerColumns(slot);
    if (innerColumns <= 1) {
      return;
    }

    const activeInner = activeInnerColumnBySlotId[slotId] ?? 0;
    const neighbor =
      direction === "left" ? activeInner - 1 : activeInner + 1;
    if (neighbor < 0 || neighbor >= innerColumns) {
      return;
    }

    onSlotsChange(
      slots.map((entry) =>
        entry.slotId === slotId
          ? swapSlotInnerColumns(entry, activeInner, neighbor)
          : entry,
      ),
    );
    setActiveInnerColumnBySlotId((current) => ({
      ...current,
      [slotId]: neighbor,
    }));
  };

  const addInnerItem = (slotId: string): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const innerColumns = getSlotInnerColumns(slot);
    const activeInner = activeInnerColumnBySlotId[slotId] ?? 0;
    const items = getSlotItems(slot);
    const columnItems = items.filter((item) => item.innerColumn === activeInner);
    const defaultField = fieldOptions[0] ?? "name";

    const nextItem: BuilderSlotItemDraft = {
      itemId: allocateItemId(slots),
      innerColumn: activeInner,
      innerOrder: columnItems.length,
      fieldPath: defaultField,
      component: "text",
      showLabel: true,
    };

    onSlotsChange(
      slots.map((entry) =>
        entry.slotId === slotId
          ? normalizeSlotInnerColumnCount(
              { ...entry, items: [...items, nextItem] },
              innerColumns,
            )
          : entry,
      ),
    );
  };

  const handleItemInnerColumnsChange = (
    slotId: string,
    itemId: string,
    nextInnerColumns: number,
  ): void => {
    if (Number.isNaN(nextInnerColumns) || nextInnerColumns < 1 || nextInnerColumns > 6) {
      return;
    }

    onSlotsChange(
      slots.map((entry) => {
        if (entry.slotId !== slotId) {
          return entry;
        }

        const items = mapSlotItemTree(getSlotItems(entry), itemId, (item) =>
          normalizeItemInnerColumnCount(item, nextInnerColumns),
        );

        return normalizeSlotInnerColumnCount(
          { ...entry, items },
          getSlotInnerColumns(entry),
        );
      }),
    );

    const activeInner = activeInnerColumnByItemId[itemId] ?? 0;
    if (activeInner >= nextInnerColumns) {
      setActiveInnerColumnByItemId((current) => ({
        ...current,
        [itemId]: nextInnerColumns - 1,
      }));
    }
  };

  const moveActiveItemInnerColumn = (
    slotId: string,
    itemId: string,
    direction: "left" | "right",
  ): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const groupItem = findSlotItemById(getSlotItems(slot), itemId);
    if (!groupItem) {
      return;
    }

    const innerColumns = getItemInnerColumns(groupItem);
    if (innerColumns <= 1) {
      return;
    }

    const activeInner = activeInnerColumnByItemId[itemId] ?? 0;
    const neighbor =
      direction === "left" ? activeInner - 1 : activeInner + 1;
    if (neighbor < 0 || neighbor >= innerColumns) {
      return;
    }

    onSlotsChange(
      slots.map((entry) => {
        if (entry.slotId !== slotId) {
          return entry;
        }

        const items = mapSlotItemTree(getSlotItems(entry), itemId, (item) =>
          swapItemInnerColumns(item, activeInner, neighbor),
        );

        return normalizeSlotInnerColumnCount(
          { ...entry, items },
          getSlotInnerColumns(entry),
        );
      }),
    );

    setActiveInnerColumnByItemId((current) => ({
      ...current,
      [itemId]: neighbor,
    }));
  };

  const addNestedInnerItem = (slotId: string, groupItemId: string): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const activeInner = activeInnerColumnByItemId[groupItemId] ?? 0;
    const defaultField = fieldOptions[0] ?? "name";

    onSlotsChange(
      slots.map((entry) => {
        if (entry.slotId !== slotId) {
          return entry;
        }

        const items = mapSlotItemTree(getSlotItems(entry), groupItemId, (groupItem) => {
          const innerColumns = getItemInnerColumns(groupItem);
          const children = getItemChildren(groupItem);
          const columnItems = children.filter(
            (child) => child.innerColumn === activeInner,
          );
          const nextItem: BuilderSlotItemDraft = {
            itemId: allocateItemId(slots),
            innerColumn: activeInner,
            innerOrder: columnItems.length,
            fieldPath: defaultField,
            component: "text",
            showLabel: true,
          };

          return normalizeItemInnerColumnCount(
            {
              ...groupItem,
              items: [...children, nextItem],
            },
            innerColumns,
          );
        });

        return normalizeSlotInnerColumnCount(
          { ...entry, items },
          getSlotInnerColumns(entry),
        );
      }),
    );
  };

  const moveInnerItemInColumn = (
    slotId: string,
    itemId: string,
    direction: "up" | "down",
  ): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const activeInner = activeInnerColumnBySlotId[slotId] ?? 0;
    const columnItems = getSlotItems(slot)
      .filter((item) => item.innerColumn === activeInner)
      .sort((left, right) => left.innerOrder - right.innerOrder);
    const index = columnItems.findIndex((item) => item.itemId === itemId);
    if (index === -1) {
      return;
    }
    if (direction === "up" && index === 0) {
      return;
    }
    if (direction === "down" && index === columnItems.length - 1) {
      return;
    }

    const reordered = [...columnItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex]!,
      reordered[index]!,
    ];

    const orderByItemId = new Map(
      reordered.map((item, order) => [item.itemId, order] as const),
    );

    onSlotsChange(
      slots.map((entry) => {
        if (entry.slotId !== slotId) {
          return entry;
        }

        const items = getSlotItems(entry).map((item) =>
          item.innerColumn !== activeInner
            ? item
            : {
                ...item,
                innerOrder: orderByItemId.get(item.itemId) ?? item.innerOrder,
              },
        );

        return normalizeSlotInnerColumnCount(
          { ...entry, items },
          getSlotInnerColumns(entry),
        );
      }),
    );
  };

  const removeInnerItem = (slotId: string, itemId: string): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const innerColumns = getSlotInnerColumns(slot);
    const remainingItems = removeSlotItemFromTree(getSlotItems(slot), itemId);

    if (remainingItems.length === 0) {
      removeSlot(slotId);
      return;
    }

    onSlotsChange(
      slots.map((entry) =>
        entry.slotId === slotId
          ? normalizeSlotInnerColumnCount(
              { ...entry, items: remainingItems },
              innerColumns,
            )
          : entry,
      ),
    );
    removeCollapsedItemIds([itemId]);
  };

  const moveNestedInnerItemInColumn = (
    slotId: string,
    groupItemId: string,
    itemId: string,
    direction: "up" | "down",
  ): void => {
    const slot = slots.find((entry) => entry.slotId === slotId);
    if (!slot) {
      return;
    }

    const groupItem = findSlotItemById(getSlotItems(slot), groupItemId);
    if (!groupItem) {
      return;
    }

    const activeInner = activeInnerColumnByItemId[groupItemId] ?? 0;
    const columnItems = getItemChildren(groupItem)
      .filter((item) => item.innerColumn === activeInner)
      .sort((left, right) => left.innerOrder - right.innerOrder);
    const index = columnItems.findIndex((item) => item.itemId === itemId);
    if (index === -1) {
      return;
    }
    if (direction === "up" && index === 0) {
      return;
    }
    if (direction === "down" && index === columnItems.length - 1) {
      return;
    }

    const reordered = [...columnItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [reordered[index], reordered[swapIndex]] = [
      reordered[swapIndex]!,
      reordered[index]!,
    ];

    const orderByItemId = new Map(
      reordered.map((item, order) => [item.itemId, order] as const),
    );

    onSlotsChange(
      slots.map((entry) => {
        if (entry.slotId !== slotId) {
          return entry;
        }

        const items = mapSlotItemTree(getSlotItems(entry), groupItemId, (item) => {
          const children = getItemChildren(item).map((child) =>
            child.innerColumn !== activeInner
              ? child
              : {
                  ...child,
                  innerOrder: orderByItemId.get(child.itemId) ?? child.innerOrder,
                },
          );

          return normalizeItemInnerColumnCount(
            { ...item, items: children },
            getItemInnerColumns(item),
          );
        });

        return normalizeSlotInnerColumnCount(
          { ...entry, items },
          getSlotInnerColumns(entry),
        );
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
    const slot = slots.find((entry) => entry.slotId === slotId);
    const removedItemIds = slot
      ? collectSlotTreeItemIds([slot])
      : [];
    const remaining = slots.filter((entry) => entry.slotId !== slotId);
    onSlotsChange(normalizeSlotsForColumnCount(remaining, columns));
    setCollapsedSlotIds((current) => {
      if (!current.has(slotId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(slotId);
      return next;
    });
    removeCollapsedItemIds(removedItemIds);
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

  const moveActiveColumn = (direction: "left" | "right"): void => {
    if (columns <= 1) {
      return;
    }

    const neighbor =
      direction === "left" ? activeColumn - 1 : activeColumn + 1;
    if (neighbor < 0 || neighbor >= columns) {
      return;
    }

    onSlotsChange(swapBuilderColumns(slots, activeColumn, neighbor));
    setActiveColumn(neighbor);
  };

  const removeActiveColumn = (): void => {
    if (columns <= 1) {
      return;
    }

    const removedSlotIds = slots
      .filter((slot) => slot.column === activeColumn)
      .map((slot) => slot.slotId);
    const removedItemIds = slots
      .filter((slot) => slot.column === activeColumn)
      .flatMap((slot) => collectSlotTreeItemIds([slot]));
    const nextColumns = columns - 1;

    onSlotsChange(removeBuilderColumn(slots, activeColumn, columns));
    onColumnsChange(nextColumns);

    setCollapsedSlotIds((current) => {
      if (removedSlotIds.length === 0) {
        return current;
      }
      const next = new Set(current);
      for (const slotId of removedSlotIds) {
        next.delete(slotId);
      }
      return next;
    });

    removeCollapsedItemIds(removedItemIds);

    if (activeColumn >= nextColumns) {
      setActiveColumn(nextColumns - 1);
    }
  };

  return (
    <div className={cn("flex max-h-full min-h-0 flex-1 gap-6 overflow-hidden", className)}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="bg-popover shrink-0">
          <Text className="mb-3 font-semibold">{labels.preview}</Text>
          {previewItem ? (
            <LayoutCard actions={showActions ? <span /> : null}>
              <LayoutRenderer
                layout={layout}
                columnHighlights={previewColumnHighlights}
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

        <div className="flex shrink-0 flex-col gap-1">
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
      </div>

      <div className="border-border flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden border-l pl-6">
        <Text className="shrink-0 font-semibold">{labels.structure}</Text>

        <div className="flex shrink-0 flex-col gap-4 pr-1">
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
            <div className="flex items-center gap-2">
              {columns > 1 ? (
                <IconButton
                  label={labels.moveColumnLeft}
                  size="sm"
                  disabled={activeColumn === 0}
                  onClick={() => moveActiveColumn("left")}
                >
                  <ArrowLeft className="size-4" />
                </IconButton>
              ) : null}
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
                className={columns > 1 ? "min-w-0 flex-1" : undefined}
              />
              {columns > 1 ? (
                <IconButton
                  label={labels.moveColumnRight}
                  size="sm"
                  disabled={activeColumn >= columns - 1}
                  onClick={() => moveActiveColumn("right")}
                >
                  <ArrowRight className="size-4" />
                </IconButton>
              ) : null}
              <IconButton
                label={labels.deleteColumn(activeColumn + 1)}
                size="sm"
                disabled={columns <= 1}
                onClick={removeActiveColumn}
              >
                <Trash2 className="text-destructive size-4" />
              </IconButton>
            </div>
          ) : null}

          <Checkbox
            checked={showActions}
            onChange={(event) => onShowActionsChange(event.target.checked)}
            label={labels.showActions}
          />
        </div>

        <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-4 pr-1 pt-2">
              {columnSlots.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {labels.emptyColumn}
                </Text>
              ) : null}

              {columnSlots.map((slot, columnIndex) => {
                const innerColumns = getSlotInnerColumns(slot);
                const activeInner = activeInnerColumnBySlotId[slot.slotId] ?? 0;
                const innerColumnTabOptions: readonly SegmentedSwitchOption<string>[] =
                  Array.from({ length: innerColumns }, (_, index) => ({
                    value: String(index),
                    label: String(index + 1),
                    ariaLabel: labels.columnTab(index + 1),
                  }));
                const innerColumnItems = getSlotItems(slot)
                  .filter((item) =>
                    innerColumns === 1 ? true : item.innerColumn === activeInner,
                  )
                  .sort((left, right) => left.innerOrder - right.innerOrder);
                const isCollapsed = collapsedSlotIds.has(slot.slotId);

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
                        {columnIndex < columnSlots.length - 1 ? (
                          <IconButton
                            label={labels.moveSlotDown}
                            size="sm"
                            onClick={() =>
                              moveSlotInColumn(slot.slotId, "down")
                            }
                          >
                            <ArrowDown className="size-4" />
                          </IconButton>
                        ) : null}
                        <IconButton
                          label={labels.deleteSlot}
                          size="sm"
                          onClick={() => removeSlot(slot.slotId)}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </IconButton>
                        <IconButton
                          label={
                            isCollapsed
                              ? labels.expandSlot
                              : labels.collapseSlot
                          }
                          size="sm"
                          className="text-primary hover:text-primary bg-primary/10 hover:bg-primary/20"
                          onClick={() => toggleSlotCollapsed(slot.slotId)}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronUp className="size-4" />
                          )}
                        </IconButton>
                      </div>
                    </div>

                    {isCollapsed ? null : (
                      <>
                    <div className="flex items-center gap-3">
                      <label className="text-muted-foreground text-sm">
                        {labels.slotColumns}
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={String(innerColumns)}
                        onChange={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          handleSlotInnerColumnsChange(slot.slotId, next);
                        }}
                        className="w-20"
                      />
                    </div>

                    {innerColumns > 1 ? (
                      <div className="flex items-center gap-2">
                        <IconButton
                          label={labels.moveColumnLeft}
                          size="sm"
                          disabled={activeInner === 0}
                          onClick={() =>
                            moveActiveInnerColumn(slot.slotId, "left")
                          }
                        >
                          <ArrowLeft className="size-4" />
                        </IconButton>
                        <SegmentedSwitch
                          value={String(activeInner)}
                          options={innerColumnTabOptions}
                          onChange={(value) => {
                            const next = Number.parseInt(value, 10);
                            if (!Number.isNaN(next)) {
                              setActiveInnerColumnBySlotId((current) => ({
                                ...current,
                                [slot.slotId]: next,
                              }));
                            }
                          }}
                          ariaLabel={labels.columnTabs}
                          fullWidth
                          className="min-w-0 flex-1"
                        />
                        <IconButton
                          label={labels.moveColumnRight}
                          size="sm"
                          disabled={activeInner >= innerColumns - 1}
                          onClick={() =>
                            moveActiveInnerColumn(slot.slotId, "right")
                          }
                        >
                          <ArrowRight className="size-4" />
                        </IconButton>
                      </div>
                    ) : null}

                    {innerColumnItems.length === 0 ? (
                      <Text variant="muted" className="text-sm">
                        {labels.emptyColumn}
                      </Text>
                    ) : null}

                    {innerColumnItems.map((item, itemIndex) => {
                      const slotItemCount = getSlotItems(slot).length;
                      const showItemActions = slotItemCount > 1;
                      const isItemCollapsed = collapsedItemIds.has(item.itemId);
                      const itemInnerColumns = getItemInnerColumns(item);
                      const activeItemInner =
                        activeInnerColumnByItemId[item.itemId] ?? 0;
                      const itemInnerColumnTabOptions: readonly SegmentedSwitchOption<string>[] =
                        Array.from({ length: itemInnerColumns }, (_, index) => ({
                          value: String(index),
                          label: String(index + 1),
                          ariaLabel: labels.columnTab(index + 1),
                        }));
                      const nestedColumnItems = isItemGroup(item)
                        ? getItemChildren(item)
                            .filter((child) =>
                              itemInnerColumns === 1
                                ? true
                                : child.innerColumn === activeItemInner,
                            )
                            .sort(
                              (left, right) => left.innerOrder - right.innerOrder,
                            )
                        : [];
                      const groupChildCount = isItemGroup(item)
                        ? getItemChildren(item).length
                        : 0;

                      return (
                        <div
                          key={item.itemId}
                          className="border-border flex flex-col gap-3 rounded-md border border-dashed p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Text className="text-xs font-medium">
                              {labels.slotTitle(itemIndex + 1)}
                            </Text>
                            <div className="flex items-center gap-1">
                              {showItemActions && itemIndex > 0 ? (
                                <IconButton
                                  label={labels.moveSlotUp}
                                  size="sm"
                                  onClick={() =>
                                    moveInnerItemInColumn(
                                      slot.slotId,
                                      item.itemId,
                                      "up",
                                    )
                                  }
                                >
                                  <ArrowUp className="size-4" />
                                </IconButton>
                              ) : null}
                              {showItemActions &&
                              itemIndex < innerColumnItems.length - 1 ? (
                                <IconButton
                                  label={labels.moveSlotDown}
                                  size="sm"
                                  onClick={() =>
                                    moveInnerItemInColumn(
                                      slot.slotId,
                                      item.itemId,
                                      "down",
                                    )
                                  }
                                >
                                  <ArrowDown className="size-4" />
                                </IconButton>
                              ) : null}
                              {showItemActions ? (
                                <IconButton
                                  label={labels.deleteSlot}
                                  size="sm"
                                  onClick={() =>
                                    removeInnerItem(slot.slotId, item.itemId)
                                  }
                                >
                                  <Trash2 className="text-destructive size-4" />
                                </IconButton>
                              ) : null}
                              <IconButton
                                label={
                                  isItemCollapsed
                                    ? labels.expandSlot
                                    : labels.collapseSlot
                                }
                                size="sm"
                                className="text-primary hover:text-primary bg-primary/10 hover:bg-primary/20"
                                onClick={() =>
                                  toggleItemCollapsed(item.itemId)
                                }
                              >
                                {isItemCollapsed ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronUp className="size-4" />
                                )}
                              </IconButton>
                            </div>
                          </div>

                    {isItemCollapsed ? null : (
                      <>
                    <div className="flex items-center gap-3">
                      <label className="text-muted-foreground text-sm">
                        {labels.slotColumns}
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={String(itemInnerColumns)}
                        onChange={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          handleItemInnerColumnsChange(
                            slot.slotId,
                            item.itemId,
                            next,
                          );
                        }}
                        className="w-20"
                      />
                    </div>

                    {itemInnerColumns > 1 ? (
                      <div className="flex items-center gap-2">
                        <IconButton
                          label={labels.moveColumnLeft}
                          size="sm"
                          disabled={activeItemInner === 0}
                          onClick={() =>
                            moveActiveItemInnerColumn(
                              slot.slotId,
                              item.itemId,
                              "left",
                            )
                          }
                        >
                          <ArrowLeft className="size-4" />
                        </IconButton>
                        <SegmentedSwitch
                          value={String(activeItemInner)}
                          options={itemInnerColumnTabOptions}
                          onChange={(value) => {
                            const next = Number.parseInt(value, 10);
                            if (!Number.isNaN(next)) {
                              setActiveInnerColumnByItemId((current) => ({
                                ...current,
                                [item.itemId]: next,
                              }));
                            }
                          }}
                          ariaLabel={labels.columnTabs}
                          fullWidth
                          className="min-w-0 flex-1"
                        />
                        <IconButton
                          label={labels.moveColumnRight}
                          size="sm"
                          disabled={activeItemInner >= itemInnerColumns - 1}
                          onClick={() =>
                            moveActiveItemInnerColumn(
                              slot.slotId,
                              item.itemId,
                              "right",
                            )
                          }
                        >
                          <ArrowRight className="size-4" />
                        </IconButton>
                      </div>
                    ) : null}

                    {isItemGroup(item) ? (
                      <>
                        {nestedColumnItems.length === 0 ? (
                          <Text variant="muted" className="text-sm">
                            {labels.emptyColumn}
                          </Text>
                        ) : null}

                        {nestedColumnItems.map((nestedItem, nestedIndex) => {
                          const isNestedCollapsed = collapsedItemIds.has(
                            nestedItem.itemId,
                          );
                          const showNestedActions = groupChildCount > 1;

                          return (
                            <div
                              key={nestedItem.itemId}
                              className="border-border ml-2 flex flex-col gap-3 rounded-md border border-dotted p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Text className="text-xs font-medium">
                                  {labels.slotTitle(nestedIndex + 1)}
                                </Text>
                                <div className="flex items-center gap-1">
                                  {showNestedActions && nestedIndex > 0 ? (
                                    <IconButton
                                      label={labels.moveSlotUp}
                                      size="sm"
                                      onClick={() =>
                                        moveNestedInnerItemInColumn(
                                          slot.slotId,
                                          item.itemId,
                                          nestedItem.itemId,
                                          "up",
                                        )
                                      }
                                    >
                                      <ArrowUp className="size-4" />
                                    </IconButton>
                                  ) : null}
                                  {showNestedActions &&
                                  nestedIndex < nestedColumnItems.length - 1 ? (
                                    <IconButton
                                      label={labels.moveSlotDown}
                                      size="sm"
                                      onClick={() =>
                                        moveNestedInnerItemInColumn(
                                          slot.slotId,
                                          item.itemId,
                                          nestedItem.itemId,
                                          "down",
                                        )
                                      }
                                    >
                                      <ArrowDown className="size-4" />
                                    </IconButton>
                                  ) : null}
                                  {showNestedActions ? (
                                    <IconButton
                                      label={labels.deleteSlot}
                                      size="sm"
                                      onClick={() =>
                                        removeInnerItem(
                                          slot.slotId,
                                          nestedItem.itemId,
                                        )
                                      }
                                    >
                                      <Trash2 className="text-destructive size-4" />
                                    </IconButton>
                                  ) : null}
                                  <IconButton
                                    label={
                                      isNestedCollapsed
                                        ? labels.expandSlot
                                        : labels.collapseSlot
                                    }
                                    size="sm"
                                    className="text-primary hover:text-primary bg-primary/10 hover:bg-primary/20"
                                    onClick={() =>
                                      toggleItemCollapsed(nestedItem.itemId)
                                    }
                                  >
                                    {isNestedCollapsed ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronUp className="size-4" />
                                    )}
                                  </IconButton>
                                </div>
                              </div>

                              {isNestedCollapsed ? null : (
                                <CardLayoutSlotItemFields
                                  {...slotItemFieldProps(
                                    slot.slotId,
                                    nestedItem,
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() =>
                            addNestedInnerItem(slot.slotId, item.itemId)
                          }
                        >
                          {labels.addInnerItem}
                        </Button>
                      </>
                    ) : (
                      <CardLayoutSlotItemFields
                        {...slotItemFieldProps(slot.slotId, item)}
                      />
                    )}

                      </>
                    )}

                        </div>
                      );
                    })}

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
                            updateSlotGroup(slot.slotId, {
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
                            updateSlotGroup(slot.slotId, {
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

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => addInnerItem(slot.slotId)}
                    >
                      {labels.addInnerItem}
                    </Button>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <Button type="button" variant="outline" className="shrink-0" onClick={addSlot}>
          {labels.addSlot}
        </Button>
      </div>
    </div>
  );
}
