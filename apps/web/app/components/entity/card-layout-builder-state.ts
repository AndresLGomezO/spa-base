import type {
  CardBadgeVariant,
  CardLayoutConfig,
  CardSlotBinding,
  CardSlotComponentType,
  CardTextColor,
  LayoutAlign,
  LayoutContainerNode,
  LayoutJustify,
  LayoutNode,
  LayoutSpacingKey,
  MetricBindingSource,
  ViewConfig,
} from "@repo/entities";
import { isCardMetricKpiBinding, LAYOUT_SPACING_KEYS } from "@repo/entities";
import { createDefaultCardLayout } from "@repo/ui";

export type BuilderSlotHorizontalAlign = LayoutAlign;
export type BuilderSlotVerticalAlign = Exclude<LayoutJustify, "between">;

export interface BuilderSlotItemDraft {
  readonly itemId: string;
  readonly innerColumn: number;
  readonly innerOrder: number;
  readonly innerColumns?: number;
  readonly items?: readonly BuilderSlotItemDraft[];
  readonly fieldPath: string;
  readonly fallbackFieldPaths?: readonly string[];
  readonly align?: BuilderSlotHorizontalAlign;
  readonly component: CardSlotComponentType;
  readonly metricDefinitionId?: string;
  readonly groupBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly showLabel?: boolean;
  readonly label?: string;
  readonly labelPosition?: "above" | "below";
  readonly dateDisplayFormat?: "date" | "datetime" | "time";
  readonly className?: string;
  readonly imageSize?: number;
  readonly textSize?: number;
  readonly staticText?: string;
  readonly textColor?: CardTextColor;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly badgeVariantRules?: readonly BadgeVariantRule[];
  readonly marginX?: number;
  readonly marginY?: number;
  readonly marginTop?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly padding?: number;
}

export interface BuilderSlotDraft {
  readonly slotId: string;
  readonly column: number;
  readonly order: number;
  readonly innerColumns?: number;
  readonly items?: readonly BuilderSlotItemDraft[];
  readonly fieldPath: string;
  readonly fallbackFieldPaths?: readonly string[];
  readonly component: CardSlotComponentType;
  readonly metricDefinitionId?: string;
  readonly groupBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly align?: BuilderSlotHorizontalAlign;
  readonly justify?: BuilderSlotVerticalAlign;
  readonly showLabel?: boolean;
  readonly label?: string;
  readonly labelPosition?: "above" | "below";
  readonly dateDisplayFormat?: "date" | "datetime" | "time";
  readonly className?: string;
  readonly imageSize?: number;
  readonly textSize?: number;
  readonly staticText?: string;
  readonly textColor?: CardTextColor;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly badgeVariantRules?: readonly BadgeVariantRule[];
  readonly marginX?: number;
  readonly marginY?: number;
  readonly marginTop?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;
  readonly marginRight?: number;
  readonly padding?: number;
}

export interface BadgeVariantRule {
  readonly matchValue: string;
  readonly variant: CardBadgeVariant;
}

const SLOT_ID_NUMERIC_SUFFIX = /^slot-(\d+)$/;
const ITEM_ID_NUMERIC_SUFFIX = /^item-(\d+)$/;

type SpacingFields = Pick<BuilderSlotItemDraft, LayoutSpacingKey>;

function spacingFieldsFrom(source: Partial<SpacingFields>): SpacingFields {
  const result: SpacingFields = {};
  for (const key of LAYOUT_SPACING_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function layoutNodeSpacingFromItem(item: BuilderSlotItemDraft): SpacingFields {
  return spacingFieldsFrom(item);
}

function spacingFieldsFromBinding(binding: CardSlotBinding): SpacingFields {
  return spacingFieldsFrom(binding as Partial<SpacingFields>);
}

export function allocateSlotId(slots: readonly BuilderSlotDraft[]): string {
  const used = new Set(slots.map((slot) => slot.slotId));
  let maxNumeric = 0;

  for (const slotId of used) {
    const match = SLOT_ID_NUMERIC_SUFFIX.exec(slotId);
    if (match) {
      maxNumeric = Math.max(maxNumeric, Number.parseInt(match[1]!, 10));
    }
  }

  let candidate = maxNumeric + 1;
  while (used.has(`slot-${candidate}`)) {
    candidate += 1;
  }

  return `slot-${candidate}`;
}

function collectItemIdsRecursive(
  item: BuilderSlotItemDraft,
  used: Set<string>,
): void {
  used.add(item.itemId);
  if (item.items) {
    for (const child of item.items) {
      collectItemIdsRecursive(child, used);
    }
  }
}

export function allocateItemId(slots: readonly BuilderSlotDraft[]): string {
  const used = new Set<string>();
  for (const slot of slots) {
    for (const item of getSlotItems(slot)) {
      collectItemIdsRecursive(item, used);
    }
  }

  let maxNumeric = 0;
  for (const itemId of used) {
    const match = ITEM_ID_NUMERIC_SUFFIX.exec(itemId);
    if (match) {
      maxNumeric = Math.max(maxNumeric, Number.parseInt(match[1]!, 10));
    }
  }

  let candidate = maxNumeric + 1;
  while (used.has(`item-${candidate}`)) {
    candidate += 1;
  }

  return `item-${candidate}`;
}

function badgeVariantRulesFromMap(
  map?: Readonly<Record<string, CardBadgeVariant>>,
): readonly BadgeVariantRule[] {
  if (!map) {
    return [];
  }

  return Object.entries(map).map(([matchValue, variant]) => ({
    matchValue,
    variant,
  }));
}

function badgeVariantMapFromRules(
  rules: readonly BadgeVariantRule[],
): Readonly<Record<string, CardBadgeVariant>> | undefined {
  const entries = rules
    .map((rule) => [rule.matchValue.trim(), rule.variant] as const)
    .filter(([matchValue]) => matchValue.length > 0);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export function defaultSlotAlignForColumn(
  column: number,
  columns: number,
): BuilderSlotHorizontalAlign {
  if (column === 0) {
    return "center";
  }
  if (column === columns - 1) {
    return "end";
  }
  return "start";
}

function resolveSlotNodeAlign(
  slot: BuilderSlotDraft,
  column: number,
  columns: number,
): LayoutAlign {
  return slot.align ?? defaultSlotAlignForColumn(column, columns);
}

function resolveItemNodeAlign(
  item: BuilderSlotItemDraft,
  slotAlign: LayoutAlign,
): LayoutAlign {
  return item.align ?? slotAlign;
}

function itemBindingFieldsFromSlot(
  slot: BuilderSlotDraft,
): Omit<
  BuilderSlotItemDraft,
  "itemId" | "innerColumn" | "innerOrder" | "fieldPath" | "component"
> {
  return {
    ...(slot.metricDefinitionId !== undefined
      ? { metricDefinitionId: slot.metricDefinitionId }
      : {}),
    ...(slot.groupBindings ? { groupBindings: slot.groupBindings } : {}),
    ...(slot.dimensionBindings
      ? { dimensionBindings: slot.dimensionBindings }
      : {}),
    ...(slot.showLabel !== undefined ? { showLabel: slot.showLabel } : {}),
    ...(slot.label ? { label: slot.label } : {}),
    ...(slot.labelPosition !== undefined
      ? { labelPosition: slot.labelPosition }
      : {}),
    ...(slot.dateDisplayFormat !== undefined
      ? { dateDisplayFormat: slot.dateDisplayFormat }
      : {}),
    ...(slot.fallbackFieldPaths && slot.fallbackFieldPaths.length > 0
      ? { fallbackFieldPaths: slot.fallbackFieldPaths }
      : {}),
    ...(slot.className ? { className: slot.className } : {}),
    ...(slot.imageSize !== undefined ? { imageSize: slot.imageSize } : {}),
    ...(slot.textSize !== undefined ? { textSize: slot.textSize } : {}),
    ...(slot.staticText !== undefined ? { staticText: slot.staticText } : {}),
    ...(slot.textColor !== undefined ? { textColor: slot.textColor } : {}),
    ...(slot.textThin ? { textThin: true } : {}),
    ...(slot.textBold ? { textBold: true } : {}),
    ...(slot.textItalic ? { textItalic: true } : {}),
    ...(slot.textUnderline ? { textUnderline: true } : {}),
    ...(slot.badgeVariantRules
      ? { badgeVariantRules: slot.badgeVariantRules }
      : {}),
    ...spacingFieldsFrom(slot),
  };
}

export function getSlotItems(
  slot: BuilderSlotDraft,
): readonly BuilderSlotItemDraft[] {
  if (slot.items && slot.items.length > 0) {
    return slot.items;
  }

  return [
    {
      itemId: slot.slotId,
      innerColumn: 0,
      innerOrder: 0,
      fieldPath: slot.fieldPath,
      component: slot.component,
      ...itemBindingFieldsFromSlot(slot),
    },
  ];
}

export function getSlotInnerColumns(slot: BuilderSlotDraft): number {
  return Math.max(1, Math.min(6, Math.trunc(slot.innerColumns ?? 1)));
}

function itemBindingFieldsFromItem(
  item: BuilderSlotItemDraft,
): Omit<
  BuilderSlotItemDraft,
  | "itemId"
  | "innerColumn"
  | "innerOrder"
  | "innerColumns"
  | "items"
  | "fieldPath"
  | "component"
> {
  return {
    ...(item.fallbackFieldPaths && item.fallbackFieldPaths.length > 0
      ? { fallbackFieldPaths: item.fallbackFieldPaths }
      : {}),
    ...(item.align !== undefined ? { align: item.align } : {}),
    ...(item.metricDefinitionId !== undefined
      ? { metricDefinitionId: item.metricDefinitionId }
      : {}),
    ...(item.groupBindings ? { groupBindings: item.groupBindings } : {}),
    ...(item.dimensionBindings
      ? { dimensionBindings: item.dimensionBindings }
      : {}),
    ...(item.showLabel !== undefined ? { showLabel: item.showLabel } : {}),
    ...(item.label ? { label: item.label } : {}),
    ...(item.labelPosition !== undefined
      ? { labelPosition: item.labelPosition }
      : {}),
    ...(item.dateDisplayFormat !== undefined
      ? { dateDisplayFormat: item.dateDisplayFormat }
      : {}),
    ...(item.className ? { className: item.className } : {}),
    ...(item.imageSize !== undefined ? { imageSize: item.imageSize } : {}),
    ...(item.textSize !== undefined ? { textSize: item.textSize } : {}),
    ...(item.staticText !== undefined ? { staticText: item.staticText } : {}),
    ...(item.textColor !== undefined ? { textColor: item.textColor } : {}),
    ...(item.textThin ? { textThin: true } : {}),
    ...(item.textBold ? { textBold: true } : {}),
    ...(item.textItalic ? { textItalic: true } : {}),
    ...(item.textUnderline ? { textUnderline: true } : {}),
    ...(item.badgeVariantRules
      ? { badgeVariantRules: item.badgeVariantRules }
      : {}),
    ...spacingFieldsFrom(item),
  };
}

export function getItemChildren(
  item: BuilderSlotItemDraft,
): readonly BuilderSlotItemDraft[] {
  if (item.items && item.items.length > 0) {
    return item.items;
  }

  return [
    {
      itemId: item.itemId,
      innerColumn: 0,
      innerOrder: 0,
      fieldPath: item.fieldPath,
      component: item.component,
      ...itemBindingFieldsFromItem(item),
    },
  ];
}

export function getItemInnerColumns(item: BuilderSlotItemDraft): number {
  return Math.max(1, Math.min(6, Math.trunc(item.innerColumns ?? 1)));
}

export function isItemGroup(item: BuilderSlotItemDraft): boolean {
  return (
    getItemInnerColumns(item) > 1 ||
    Boolean(item.items && item.items.length > 1)
  );
}

function flattenLeafOntoItem(
  item: BuilderSlotItemDraft,
  leaf: BuilderSlotItemDraft,
): BuilderSlotItemDraft {
  return {
    itemId: item.itemId,
    innerColumn: item.innerColumn,
    innerOrder: item.innerOrder,
    fieldPath: leaf.fieldPath,
    component: leaf.component,
    ...itemBindingFieldsFromItem(leaf),
  };
}

const ITEM_GROUP_ID_SUFFIX = "__group";

function itemGroupIdForLeaf(itemId: string): string {
  return `${itemId}${ITEM_GROUP_ID_SUFFIX}`;
}

export function normalizeItemInnerColumnCount(
  item: BuilderSlotItemDraft,
  nextInnerColumns: number,
): BuilderSlotItemDraft {
  const innerColumns = Math.max(1, Math.min(6, Math.trunc(nextInnerColumns)));

  if (innerColumns > 1 && !item.items) {
    const leaf = getItemChildren(item)[0]!;
    return normalizeItemInnerColumnCount(
      {
        itemId: itemGroupIdForLeaf(item.itemId),
        innerColumn: item.innerColumn,
        innerOrder: item.innerOrder,
        items: [
          {
            ...leaf,
            itemId: item.itemId,
            innerColumn: 0,
            innerOrder: 0,
          },
        ],
      },
      innerColumns,
    );
  }

  const children = [...getItemChildren(item)].map((child) => ({
    ...child,
    innerColumn: Math.min(Math.max(0, child.innerColumn), innerColumns - 1),
  }));

  const byColumn = new Map<number, BuilderSlotItemDraft[]>();
  for (const child of children) {
    const columnItems = byColumn.get(child.innerColumn) ?? [];
    columnItems.push(child);
    byColumn.set(child.innerColumn, columnItems);
  }

  const normalizedChildren: BuilderSlotItemDraft[] = [];
  for (let column = 0; column < innerColumns; column += 1) {
    const columnItems = [...(byColumn.get(column) ?? [])].sort(
      (left, right) => left.innerOrder - right.innerOrder,
    );
    columnItems.forEach((child, order) => {
      normalizedChildren.push({
        ...child,
        innerColumn: column,
        innerOrder: order,
      });
    });
  }

  if (innerColumns === 1 && normalizedChildren.length <= 1) {
    const firstChild = normalizedChildren[0] ?? getItemChildren(item)[0]!;
    return flattenLeafOntoItem(item, firstChild);
  }

  return {
    itemId: item.itemId,
    innerColumn: item.innerColumn,
    innerOrder: item.innerOrder,
    innerColumns,
    items: normalizedChildren,
    fieldPath: normalizedChildren[0]?.fieldPath ?? item.fieldPath,
    component: normalizedChildren[0]?.component ?? item.component,
    ...(item.align !== undefined ? { align: item.align } : {}),
  };
}

export function swapItemInnerColumns(
  item: BuilderSlotItemDraft,
  columnA: number,
  columnB: number,
): BuilderSlotItemDraft {
  if (columnA === columnB || getItemInnerColumns(item) <= 1) {
    return item;
  }

  const children = getItemChildren(item).map((child) => {
    if (child.innerColumn === columnA) {
      return { ...child, innerColumn: columnB };
    }
    if (child.innerColumn === columnB) {
      return { ...child, innerColumn: columnA };
    }
    return child;
  });

  return {
    ...item,
    innerColumns: getItemInnerColumns(item),
    items: children,
  };
}

export function mapSlotItemTree(
  items: readonly BuilderSlotItemDraft[],
  itemId: string,
  mapper: (item: BuilderSlotItemDraft) => BuilderSlotItemDraft,
): readonly BuilderSlotItemDraft[] {
  return items.map((item) => {
    if (item.items) {
      const nested = mapSlotItemTree(item.items, itemId, mapper);
      const nestedChanged =
        nested.length !== item.items.length ||
        nested.some((child, index) => child !== item.items![index]!);
      if (nestedChanged) {
        return normalizeItemInnerColumnCount(
          {
            ...item,
            items: nested,
          },
          getItemInnerColumns(item),
        );
      }
    }

    if (item.itemId === itemId) {
      return mapper(item);
    }

    return item;
  });
}

export function removeSlotItemFromTree(
  items: readonly BuilderSlotItemDraft[],
  itemId: string,
): readonly BuilderSlotItemDraft[] {
  if (items.some((item) => item.itemId === itemId)) {
    return items.filter((item) => item.itemId !== itemId);
  }

  return items.map((item) => {
    if (!item.items) {
      return item;
    }

    const nested = removeSlotItemFromTree(item.items, itemId);
    if (nested === item.items) {
      return item;
    }

    return normalizeItemInnerColumnCount(
      { ...item, items: nested },
      getItemInnerColumns(item),
    );
  });
}

export function collectSlotTreeItemIds(
  slots: readonly BuilderSlotDraft[],
): readonly string[] {
  const ids: string[] = [];

  const walk = (item: BuilderSlotItemDraft): void => {
    ids.push(item.itemId);
    if (item.items) {
      for (const child of item.items) {
        walk(child);
      }
    }
  };

  for (const slot of slots) {
    for (const item of getSlotItems(slot)) {
      walk(item);
    }
  }

  return ids;
}

function flattenItemOntoSlot(
  slot: Omit<BuilderSlotDraft, "items" | "innerColumns">,
  item: BuilderSlotItemDraft,
): BuilderSlotDraft {
  return {
    ...slot,
    innerColumns: 1,
    fieldPath: item.fieldPath,
    component: item.component,
    ...(item.fallbackFieldPaths && item.fallbackFieldPaths.length > 0
      ? { fallbackFieldPaths: item.fallbackFieldPaths }
      : {}),
    ...(item.align !== undefined ? { align: item.align } : {}),
    ...(item.metricDefinitionId !== undefined
      ? { metricDefinitionId: item.metricDefinitionId }
      : {}),
    ...(item.groupBindings ? { groupBindings: item.groupBindings } : {}),
    ...(item.dimensionBindings
      ? { dimensionBindings: item.dimensionBindings }
      : {}),
    ...(item.showLabel !== undefined ? { showLabel: item.showLabel } : {}),
    ...(item.label ? { label: item.label } : {}),
    ...(item.labelPosition !== undefined
      ? { labelPosition: item.labelPosition }
      : {}),
    ...(item.dateDisplayFormat !== undefined
      ? { dateDisplayFormat: item.dateDisplayFormat }
      : {}),
    ...(item.className ? { className: item.className } : {}),
    ...(item.imageSize !== undefined ? { imageSize: item.imageSize } : {}),
    ...(item.textSize !== undefined ? { textSize: item.textSize } : {}),
    ...(item.staticText !== undefined ? { staticText: item.staticText } : {}),
    ...(item.textColor !== undefined ? { textColor: item.textColor } : {}),
    ...(item.textThin ? { textThin: true } : {}),
    ...(item.textBold ? { textBold: true } : {}),
    ...(item.textItalic ? { textItalic: true } : {}),
    ...(item.textUnderline ? { textUnderline: true } : {}),
    ...(item.badgeVariantRules
      ? { badgeVariantRules: item.badgeVariantRules }
      : {}),
    ...spacingFieldsFrom(item),
  };
}

function stripSlotLevelBindingFields(
  slot: BuilderSlotDraft,
): BuilderSlotDraft {
  const {
    fallbackFieldPaths: _fallbackFieldPaths,
    metricDefinitionId: _metricDefinitionId,
    groupBindings: _groupBindings,
    dimensionBindings: _dimensionBindings,
    showLabel: _showLabel,
    label: _label,
    labelPosition: _labelPosition,
    dateDisplayFormat: _dateDisplayFormat,
    className: _className,
    imageSize: _imageSize,
    textSize: _textSize,
    staticText: _staticText,
    textColor: _textColor,
    textThin: _textThin,
    textBold: _textBold,
    textItalic: _textItalic,
    textUnderline: _textUnderline,
    badgeVariantRules: _badgeVariantRules,
    marginX: _marginX,
    marginY: _marginY,
    marginTop: _marginTop,
    marginBottom: _marginBottom,
    marginLeft: _marginLeft,
    marginRight: _marginRight,
    padding: _padding,
    ...rest
  } = slot;

  return rest;
}

export function normalizeSlotInnerColumnCount(
  slot: BuilderSlotDraft,
  nextInnerColumns: number,
): BuilderSlotDraft {
  const innerColumns = Math.max(1, Math.min(6, Math.trunc(nextInnerColumns)));
  const baseSlot = stripSlotLevelBindingFields(slot);
  const items = [...getSlotItems(slot)].map((item) => ({
    ...item,
    innerColumn: Math.min(Math.max(0, item.innerColumn), innerColumns - 1),
  }));

  const byColumn = new Map<number, BuilderSlotItemDraft[]>();
  for (const item of items) {
    const columnItems = byColumn.get(item.innerColumn) ?? [];
    columnItems.push(item);
    byColumn.set(item.innerColumn, columnItems);
  }

  const normalizedItems: BuilderSlotItemDraft[] = [];
  for (let column = 0; column < innerColumns; column += 1) {
    const columnItems = [...(byColumn.get(column) ?? [])].sort(
      (left, right) => left.innerOrder - right.innerOrder,
    );
    columnItems.forEach((item, order) => {
      normalizedItems.push({ ...item, innerColumn: column, innerOrder: order });
    });
  }

  if (innerColumns === 1 && normalizedItems.length <= 1) {
    const firstItem = normalizedItems[0] ?? getSlotItems(slot)[0]!;
    return flattenItemOntoSlot(baseSlot, firstItem);
  }

  return {
    slotId: baseSlot.slotId,
    column: baseSlot.column,
    order: baseSlot.order,
    innerColumns,
    items: normalizedItems,
    fieldPath: normalizedItems[0]?.fieldPath ?? baseSlot.fieldPath,
    component: normalizedItems[0]?.component ?? baseSlot.component,
    ...(baseSlot.align ? { align: baseSlot.align } : {}),
    ...(baseSlot.justify ? { justify: baseSlot.justify } : {}),
  };
}

export function swapSlotInnerColumns(
  slot: BuilderSlotDraft,
  columnA: number,
  columnB: number,
): BuilderSlotDraft {
  if (columnA === columnB || getSlotInnerColumns(slot) <= 1) {
    return slot;
  }

  const items = getSlotItems(slot).map((item) => {
    if (item.innerColumn === columnA) {
      return { ...item, innerColumn: columnB };
    }
    if (item.innerColumn === columnB) {
      return { ...item, innerColumn: columnA };
    }
    return item;
  });

  return {
    ...slot,
    innerColumns: getSlotInnerColumns(slot),
    items,
  };
}

export function normalizeSlotsForColumnCount(
  slots: readonly BuilderSlotDraft[],
  nextColumns: number,
): readonly BuilderSlotDraft[] {
  const parsedColumns = Math.max(1, Math.min(6, Math.trunc(nextColumns)));
  const lastColumn = parsedColumns - 1;

  const clamped = slots.map((slot) => ({
    ...slot,
    column: Math.min(Math.max(0, slot.column), lastColumn),
  }));

  const byColumn = new Map<number, BuilderSlotDraft[]>();
  for (const slot of clamped) {
    const columnSlots = byColumn.get(slot.column) ?? [];
    columnSlots.push(slot);
    byColumn.set(slot.column, columnSlots);
  }

  const normalized: BuilderSlotDraft[] = [];
  for (let column = 0; column < parsedColumns; column += 1) {
    const columnSlots = [...(byColumn.get(column) ?? [])].sort(
      (left, right) => left.order - right.order,
    );
    columnSlots.forEach((slot, order) => {
      normalized.push({ ...slot, column, order });
    });
  }

  return normalized;
}

export function swapBuilderColumns(
  slots: readonly BuilderSlotDraft[],
  columnA: number,
  columnB: number,
): readonly BuilderSlotDraft[] {
  if (columnA === columnB) {
    return slots;
  }

  return slots.map((slot) => {
    if (slot.column === columnA) {
      return { ...slot, column: columnB };
    }
    if (slot.column === columnB) {
      return { ...slot, column: columnA };
    }
    return slot;
  });
}

export function removeBuilderColumn(
  slots: readonly BuilderSlotDraft[],
  columnToRemove: number,
  currentColumns: number,
): readonly BuilderSlotDraft[] {
  if (currentColumns <= 1) {
    return slots;
  }
  if (columnToRemove < 0 || columnToRemove >= currentColumns) {
    return slots;
  }

  const nextColumns = currentColumns - 1;
  const remaining = slots
    .filter((slot) => slot.column !== columnToRemove)
    .map((slot) =>
      slot.column > columnToRemove
        ? { ...slot, column: slot.column - 1 }
        : slot,
    );

  return normalizeSlotsForColumnCount(remaining, nextColumns);
}

function bindingFromItem(item: BuilderSlotItemDraft): CardSlotBinding {
  if (item.component === "metric-kpi") {
    return {
      component: "metric-kpi",
      metricDefinitionId: item.metricDefinitionId ?? "",
      groupBindings: item.groupBindings ?? {},
      dimensionBindings: item.dimensionBindings ?? {},
      ...(item.label ? { label: item.label } : {}),
      ...(item.className ? { className: item.className } : {}),
      ...(item.align !== undefined ? { align: item.align } : {}),
      ...(item.textSize !== undefined ? { textSize: item.textSize } : {}),
      ...(item.textBold !== undefined ? { textBold: item.textBold } : {}),
      ...spacingFieldsFrom(item),
    };
  }

  const badgeVariants = badgeVariantMapFromRules(item.badgeVariantRules ?? []);

  return {
    component: item.component,
    fieldPath: item.fieldPath,
    ...(item.fallbackFieldPaths && item.fallbackFieldPaths.length > 0
      ? { fallbackFieldPaths: item.fallbackFieldPaths }
      : {}),
    ...(item.align !== undefined ? { align: item.align } : {}),
    ...(item.staticText !== undefined ? { staticText: item.staticText } : {}),
    ...(item.showLabel !== undefined ? { showLabel: item.showLabel } : {}),
    ...(item.label ? { label: item.label } : {}),
    ...(item.labelPosition !== undefined
      ? { labelPosition: item.labelPosition }
      : {}),
    ...(item.dateDisplayFormat !== undefined
      ? { dateDisplayFormat: item.dateDisplayFormat }
      : {}),
    ...(item.className ? { className: item.className } : {}),
    ...(item.imageSize !== undefined ? { imageSize: item.imageSize } : {}),
    ...(item.textSize !== undefined ? { textSize: item.textSize } : {}),
    ...(item.textColor !== undefined ? { textColor: item.textColor } : {}),
    ...(item.textThin ? { textThin: true } : {}),
    ...(item.textBold ? { textBold: true } : {}),
    ...(item.textItalic ? { textItalic: true } : {}),
    ...(item.textUnderline ? { textUnderline: true } : {}),
    ...(badgeVariants ? { badgeVariants } : {}),
    ...spacingFieldsFrom(item),
  };
}

function itemFromBinding(
  itemId: string,
  innerColumn: number,
  innerOrder: number,
  binding: CardSlotBinding,
  nodeAlign?: LayoutAlign,
): BuilderSlotItemDraft {
  const isLegacyLabeledText = binding.component === "labeled-text";
  const isMetricKpi = isCardMetricKpiBinding(binding);
  const bindingAlign =
    "align" in binding && binding.align !== undefined
      ? binding.align
      : undefined;
  const resolvedAlign = bindingAlign ?? nodeAlign;

  return {
    itemId,
    innerColumn,
    innerOrder,
    fieldPath: isMetricKpi ? "" : binding.fieldPath,
    component: isLegacyLabeledText ? "text" : binding.component,
    ...(resolvedAlign !== undefined ? { align: resolvedAlign } : {}),
    ...spacingFieldsFromBinding(binding),
    ...(isMetricKpi
      ? {
          metricDefinitionId: binding.metricDefinitionId,
          groupBindings: binding.groupBindings,
          dimensionBindings: binding.dimensionBindings,
          ...(binding.label ? { label: binding.label } : {}),
          ...(binding.textSize !== undefined
            ? { textSize: binding.textSize }
            : {}),
          ...(binding.textBold !== undefined
            ? { textBold: binding.textBold }
            : {}),
        }
      : {}),
    ...(!isMetricKpi
      ? {
          ...(isLegacyLabeledText ||
          ("showLabel" in binding && binding.showLabel !== undefined)
            ? {
                showLabel: isLegacyLabeledText
                  ? true
                  : "showLabel" in binding
                    ? binding.showLabel
                    : undefined,
              }
            : {}),
          ...("label" in binding && binding.label
            ? { label: binding.label }
            : {}),
          ...("labelPosition" in binding && binding.labelPosition !== undefined
            ? { labelPosition: binding.labelPosition }
            : {}),
          ...("dateDisplayFormat" in binding &&
          binding.dateDisplayFormat !== undefined
            ? { dateDisplayFormat: binding.dateDisplayFormat }
            : {}),
          ...("fallbackFieldPaths" in binding &&
          binding.fallbackFieldPaths &&
          binding.fallbackFieldPaths.length > 0
            ? { fallbackFieldPaths: binding.fallbackFieldPaths }
            : {}),
          ...("className" in binding && binding.className
            ? { className: binding.className }
            : {}),
          ...("imageSize" in binding && binding.imageSize !== undefined
            ? { imageSize: binding.imageSize }
            : {}),
          ...("textSize" in binding && binding.textSize !== undefined
            ? { textSize: binding.textSize }
            : {}),
          ...("staticText" in binding && binding.staticText !== undefined
            ? { staticText: binding.staticText }
            : {}),
          ...("textColor" in binding && binding.textColor !== undefined
            ? { textColor: binding.textColor }
            : {}),
          ...("textThin" in binding && binding.textThin !== undefined
            ? { textThin: binding.textThin }
            : {}),
          ...("textBold" in binding && binding.textBold !== undefined
            ? { textBold: binding.textBold }
            : {}),
          ...("textItalic" in binding && binding.textItalic !== undefined
            ? { textItalic: binding.textItalic }
            : {}),
          ...("textUnderline" in binding &&
          binding.textUnderline !== undefined
            ? { textUnderline: binding.textUnderline }
            : {}),
          ...("badgeVariants" in binding && binding.badgeVariants
            ? {
                badgeVariantRules: badgeVariantRulesFromMap(
                  binding.badgeVariants,
                ),
              }
            : {}),
        }
      : {}),
  };
}

function pushItemGroupFromGrid(
  gridChild: LayoutContainerNode & { readonly type: "grid" },
  innerColumn: number,
  innerOrder: number,
  items: BuilderSlotItemDraft[],
  layout: CardLayoutConfig,
  align?: LayoutAlign,
): void {
  const nestedItems = parseInnerGridItems(gridChild, layout);
  if (nestedItems.length === 0) {
    return;
  }

  items.push({
    itemId: gridChild.id!,
    innerColumn,
    innerOrder,
    innerColumns:
      typeof gridChild.columns === "number"
        ? gridChild.columns
        : Math.max(...nestedItems.map((entry) => entry.innerColumn)) + 1,
    items: nestedItems,
    fieldPath: nestedItems[0]!.fieldPath,
    component: nestedItems[0]!.component,
    ...(align ? { align } : {}),
  });
}

const INNER_COLUMN_ID_PATTERN = /^__col:(\d+)$/;

function resolveInnerColumnIndex(
  node: LayoutNode,
  fallbackIndex: number,
): number {
  if (typeof node.id === "string") {
    const match = INNER_COLUMN_ID_PATTERN.exec(node.id);
    if (match) {
      const parsed = Number.parseInt(match[1]!, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return fallbackIndex;
}

function withInnerColumnIndex(
  node: LayoutNode,
  innerColumn: number,
): LayoutNode {
  const columnTag = `__col:${innerColumn}`;

  if (node.type === "stack" || node.type === "grid") {
    return { ...node, id: columnTag };
  }

  return {
    type: "stack",
    direction: "column",
    id: columnTag,
    className: "w-full",
    align: "stretch",
    children: [node],
  };
}

function parseColumnStackChild(
  node: LayoutNode,
  innerColumn: number,
  innerOrder: number,
  items: BuilderSlotItemDraft[],
  layout: CardLayoutConfig,
): void {
  if (node.type === "slot") {
    const binding = layout.slots[node.slotId];
    if (!binding) {
      return;
    }

    items.push(
      itemFromBinding(
        node.slotId,
        innerColumn,
        innerOrder,
        binding,
        node.align,
      ),
    );
    return;
  }

  if (node.type === "grid" && node.id) {
    pushItemGroupFromGrid(
      node as LayoutContainerNode & { readonly type: "grid" },
      innerColumn,
      innerOrder,
      items,
      layout,
      node.align,
    );
    return;
  }

  if (node.type === "stack") {
    const gridChild = node.children.find(
      (child) => child.type === "grid" && child.id,
    );
    if (gridChild?.type === "grid" && gridChild.id) {
      pushItemGroupFromGrid(
        gridChild as LayoutContainerNode & { readonly type: "grid" },
        innerColumn,
        innerOrder,
        items,
        layout,
        node.align,
      );
      return;
    }

    node.children.forEach((nested, nestedOrder) => {
      parseColumnStackChild(
        nested,
        innerColumn,
        innerOrder + nestedOrder,
        items,
        layout,
      );
    });
  }
}

function parseInnerGridItems(
  node: LayoutContainerNode & { readonly type: "grid" },
  layout: CardLayoutConfig,
): readonly BuilderSlotItemDraft[] {
  const items: BuilderSlotItemDraft[] = [];

  node.children.forEach((child, childIndex) => {
    const innerColumn = resolveInnerColumnIndex(child, childIndex);

    if (child.type === "grid" && child.id) {
      pushItemGroupFromGrid(
        child as LayoutContainerNode & { readonly type: "grid" },
        innerColumn,
        items.filter((entry) => entry.innerColumn === innerColumn).length,
        items,
        layout,
        child.align,
      );
      return;
    }

    if (child.type === "slot") {
      const binding = layout.slots[child.slotId];
      if (!binding) {
        return;
      }
      items.push(
        itemFromBinding(
          child.slotId,
          innerColumn,
          items.filter((entry) => entry.innerColumn === innerColumn).length,
          binding,
          child.align,
        ),
      );
      return;
    }

    if (child.type === "stack") {
      const onlyChild = child.children.length === 1 ? child.children[0] : undefined;
      if (onlyChild?.type === "grid" && onlyChild.id) {
        pushItemGroupFromGrid(
          onlyChild as LayoutContainerNode & { readonly type: "grid" },
          innerColumn,
          items.filter((entry) => entry.innerColumn === innerColumn).length,
          items,
          layout,
          child.align,
        );
        return;
      }

      child.children.forEach((stackChild, innerOrder) => {
        parseColumnStackChild(
          stackChild,
          innerColumn,
          innerOrder,
          items,
          layout,
        );
      });
    }
  });

  return items;
}

function unwrapSlotGroupAlignmentWrapper(node: LayoutNode): {
  readonly node: LayoutNode;
  readonly align?: LayoutAlign;
  readonly justify?: BuilderSlotVerticalAlign;
} {
  if (
    node.type === "stack" &&
    node.direction !== "row" &&
    node.children.length === 1
  ) {
    const child = node.children[0]!;
    if (child.type === "grid" && child.id) {
      return {
        node: child,
        ...(node.align ? { align: node.align } : {}),
        ...(node.justify && node.justify !== "between"
          ? { justify: node.justify }
          : {}),
      };
    }
  }

  return { node };
}

function resolveSlotGroupAlignFromInnerGrid(
  grid: LayoutContainerNode & { readonly type: "grid" },
): LayoutAlign | undefined {
  for (const child of grid.children) {
    if (child.align) {
      return child.align;
    }
    if (child.type === "stack" && child.align) {
      return child.align;
    }
  }
  return undefined;
}

function slotDraftFromMainNode(
  node: LayoutNode,
  layout: CardLayoutConfig,
  column: number,
  order: number,
  alignBySlot: ReadonlyMap<string, LayoutAlign>,
  justifyBySlot: ReadonlyMap<string, BuilderSlotVerticalAlign>,
): BuilderSlotDraft | null {
  const {
    node: effectiveNode,
    align: wrapperAlign,
    justify: wrapperJustify,
  } = unwrapSlotGroupAlignmentWrapper(node);

  if (effectiveNode.type === "slot") {
    const binding = layout.slots[effectiveNode.slotId];
    if (!binding) {
      return null;
    }

    const item = itemFromBinding(effectiveNode.slotId, 0, 0, binding);
    return {
      ...flattenItemOntoSlot(
        {
          slotId: effectiveNode.slotId,
          column,
          order,
          fieldPath: item.fieldPath,
          component: item.component,
        },
        item,
      ),
      innerColumns: 1,
      ...(alignBySlot.has(effectiveNode.slotId)
        ? { align: alignBySlot.get(effectiveNode.slotId) }
        : {}),
      ...(wrapperAlign ? { align: wrapperAlign } : {}),
      ...(effectiveNode.align ? { align: effectiveNode.align } : {}),
      ...(justifyBySlot.has(effectiveNode.slotId)
        ? { justify: justifyBySlot.get(effectiveNode.slotId) }
        : {}),
      ...(wrapperJustify ? { justify: wrapperJustify } : {}),
      ...(effectiveNode.justify && effectiveNode.justify !== "between"
        ? { justify: effectiveNode.justify }
        : {}),
    };
  }

  if (effectiveNode.type === "grid") {
    const items = parseInnerGridItems(
      effectiveNode as LayoutContainerNode & { readonly type: "grid" },
      layout,
    );
    if (items.length === 0) {
      return null;
    }

    const innerColumns =
      typeof effectiveNode.columns === "number"
        ? effectiveNode.columns
        : Math.max(...items.map((item) => item.innerColumn)) + 1;
    const slotId = effectiveNode.id ?? items[0]!.itemId;
    const innerAlign =
      wrapperAlign ??
      effectiveNode.align ??
      resolveSlotGroupAlignFromInnerGrid(
        effectiveNode as LayoutContainerNode & { readonly type: "grid" },
      );

    return {
      slotId,
      column,
      order,
      innerColumns,
      items,
      fieldPath: items[0]!.fieldPath,
      component: items[0]!.component,
      ...(innerAlign ? { align: innerAlign } : {}),
      ...(wrapperJustify ? { justify: wrapperJustify } : {}),
      ...(effectiveNode.justify && effectiveNode.justify !== "between"
        ? { justify: effectiveNode.justify }
        : {}),
    };
  }

  return null;
}

export function createBuilderSlotsFromLayout(
  layout: CardLayoutConfig,
): readonly BuilderSlotDraft[] {
  const alignBySlot = new Map<string, LayoutAlign>();
  const justifyBySlot = new Map<string, BuilderSlotVerticalAlign>();

  function collectSlotMeta(node: LayoutNode): void {
    if (node.type === "slot") {
      if (node.align) {
        alignBySlot.set(node.slotId, node.align);
      }
      if (node.justify && node.justify !== "between") {
        justifyBySlot.set(node.slotId, node.justify);
      }
      return;
    }

    for (const child of node.children) {
      collectSlotMeta(child);
    }
  }

  collectSlotMeta(layout.root);

  const drafts: BuilderSlotDraft[] = [];

  function walkMainColumns(node: LayoutNode, columnIndex: number): void {
    const unwrapped = unwrapSlotGroupAlignmentWrapper(node);
    if (unwrapped.node !== node) {
      const draft = slotDraftFromMainNode(
        node,
        layout,
        columnIndex,
        0,
        alignBySlot,
        justifyBySlot,
      );
      if (draft) {
        drafts.push(draft);
      }
      return;
    }

    if (node.type === "stack") {
      node.children.forEach((child, order) => {
        const draft = slotDraftFromMainNode(
          child,
          layout,
          columnIndex,
          order,
          alignBySlot,
          justifyBySlot,
        );
        if (draft) {
          drafts.push(draft);
        }
      });
      return;
    }

    const draft = slotDraftFromMainNode(
      node,
      layout,
      columnIndex,
      0,
      alignBySlot,
      justifyBySlot,
    );
    if (draft) {
      drafts.push(draft);
    }
  }

  if (layout.root.type === "grid") {
    layout.root.children.forEach((child, index) => {
      walkMainColumns(child, index);
    });
  } else {
    walkMainColumns(layout.root, 0);
  }

  return drafts;
}

function buildItemGroupGridNode(
  item: BuilderSlotItemDraft,
  parentAlign: LayoutAlign,
  slotBindings: Record<string, CardSlotBinding>,
): LayoutNode {
  const innerColumns = getItemInnerColumns(item);
  const children = getItemChildren(item);
  const itemAlign = item.align ?? parentAlign;
  const innerChildren: LayoutNode[] = [];

  for (let innerColumn = 0; innerColumn < innerColumns; innerColumn += 1) {
    const child = buildNestedItemColumnNode(
      children,
      innerColumn,
      itemAlign,
      slotBindings,
    );
    if (child) {
      innerChildren.push(withInnerColumnIndex(child, innerColumn));
    }
  }

  const innerGrid: LayoutNode = {
    type: "grid",
    id: item.itemId,
    direction: "row",
    gap: 8,
    columns: innerColumns,
    className: "w-full",
    align: "start",
    children: innerChildren,
  };

  return {
    type: "stack",
    direction: "column",
    className: "w-full",
    align: itemAlign,
    children: [innerGrid],
  };
}

function buildNestedItemColumnNode(
  items: readonly BuilderSlotItemDraft[],
  innerColumn: number,
  parentAlign: LayoutAlign,
  slotBindings: Record<string, CardSlotBinding>,
): LayoutNode | null {
  const columnItems = [...items]
    .filter((item) => item.innerColumn === innerColumn)
    .sort((left, right) => left.innerOrder - right.innerOrder);

  if (columnItems.length === 0) {
    return null;
  }

  if (columnItems.length === 1) {
    return buildItemLayoutNode(columnItems[0]!, parentAlign, slotBindings);
  }

  const stackChildren: LayoutNode[] = [];
  for (const item of columnItems) {
    const node = buildItemLayoutNode(item, parentAlign, slotBindings);
    if (node) {
      stackChildren.push(node);
    }
  }

  if (stackChildren.length === 0) {
    return null;
  }

  return {
    type: "stack",
    direction: "column",
    gap: 4,
    className: "w-full",
    align: "stretch",
    children: stackChildren,
  };
}

function buildItemLayoutNode(
  item: BuilderSlotItemDraft,
  parentAlign: LayoutAlign,
  slotBindings: Record<string, CardSlotBinding>,
): LayoutNode | null {
  const innerColumns = getItemInnerColumns(item);
  const children = getItemChildren(item);

  if (innerColumns > 1) {
    return buildItemGroupGridNode(item, parentAlign, slotBindings);
  }

  if (item.items && children.length > 1) {
    const stackChildren: LayoutNode[] = children.map((child) => {
      slotBindings[child.itemId] = bindingFromItem(child);
      return {
        type: "slot" as const,
        slotId: child.itemId,
        align: resolveItemNodeAlign(child, parentAlign),
        className: "w-full",
        ...layoutNodeSpacingFromItem(child),
      };
    });

    return {
      type: "stack",
      direction: "column",
      gap: 4,
      className: "w-full",
      align: "stretch",
      children: stackChildren,
    };
  }

  const leaf = children[0]!;
  slotBindings[leaf.itemId] = bindingFromItem(leaf);
  return {
    type: "slot",
    slotId: leaf.itemId,
    align: resolveItemNodeAlign(leaf, parentAlign),
    className: "w-full",
    ...layoutNodeSpacingFromItem(leaf),
  };
}

function buildInnerColumnNode(
  items: readonly BuilderSlotItemDraft[],
  innerColumn: number,
  innerColumns: number,
  slotAlign: LayoutAlign,
  slotBindings: Record<string, CardSlotBinding>,
): LayoutNode | null {
  const columnItems = [...items]
    .filter((item) => item.innerColumn === innerColumn)
    .sort((left, right) => left.innerOrder - right.innerOrder);

  if (columnItems.length === 0) {
    return null;
  }

  if (columnItems.length === 1) {
    return buildItemLayoutNode(columnItems[0]!, slotAlign, slotBindings);
  }

  const stackChildren: LayoutNode[] = [];
  for (const item of columnItems) {
    const node = buildItemLayoutNode(item, slotAlign, slotBindings);
    if (node) {
      stackChildren.push(node);
    }
  }

  if (stackChildren.length === 0) {
    return null;
  }

  return {
    type: "stack",
    direction: "column",
    gap: 4,
    className: "w-full",
    align: "stretch",
    children: stackChildren,
  };
}

function buildSlotGroupNode(
  slot: BuilderSlotDraft,
  mainColumn: number,
  mainColumns: number,
  slotBindings: Record<string, CardSlotBinding>,
): LayoutNode | null {
  const innerColumns = getSlotInnerColumns(slot);
  const items = getSlotItems(slot);

  if (items.length === 0) {
    return null;
  }

  const slotAlign = resolveSlotNodeAlign(slot, mainColumn, mainColumns);

  if (innerColumns === 1 && items.length === 1 && !isItemGroup(items[0]!)) {
    const item = items[0]!;
    slotBindings[item.itemId] = bindingFromItem(item);
    return {
      type: "slot",
      slotId: item.itemId,
      align: resolveItemNodeAlign(item, slotAlign),
      ...(slot.justify
        ? { justify: slot.justify, className: "h-full w-full" }
        : { className: "w-full" }),
      flex: 1,
      ...layoutNodeSpacingFromItem(item),
    };
  }

  const innerChildren: LayoutNode[] = [];
  for (let innerColumn = 0; innerColumn < innerColumns; innerColumn += 1) {
    const child = buildInnerColumnNode(
      items,
      innerColumn,
      innerColumns,
      slotAlign,
      slotBindings,
    );
    if (child) {
      innerChildren.push(withInnerColumnIndex(child, innerColumn));
    }
  }

  if (innerChildren.length === 0) {
    return null;
  }

  const innerGrid: LayoutNode = {
    type: "grid",
    id: slot.slotId,
    direction: "row",
    gap: 8,
    columns: innerColumns,
    className: "w-full",
    align: "start",
    children: innerChildren,
  };

  return {
    type: "stack",
    direction: "column",
    flex: 1,
    className: slot.justify ? "h-full w-full" : "w-full",
    align: slotAlign,
    ...(slot.justify ? { justify: slot.justify } : {}),
    children: [innerGrid],
  };
}

export function buildLayoutFromBuilderSlots(
  slots: readonly BuilderSlotDraft[],
  options?: {
    readonly columns?: number;
    readonly showActions?: boolean;
    readonly cardsPerRow?: number;
  },
): CardLayoutConfig {
  const columns = options?.columns ?? 4;
  const slotsByColumn = new Map<number, BuilderSlotDraft[]>();

  for (const slot of slots) {
    const columnSlots = slotsByColumn.get(slot.column) ?? [];
    columnSlots.push(slot);
    slotsByColumn.set(slot.column, columnSlots);
  }

  const slotBindings: Record<string, CardSlotBinding> = {};
  const children: LayoutNode[] = [];

  for (let column = 0; column < columns; column += 1) {
    const columnSlots = [...(slotsByColumn.get(column) ?? [])].sort(
      (left, right) => left.order - right.order,
    );

    if (columnSlots.length === 0) {
      continue;
    }

    if (columnSlots.length === 1) {
      const groupNode = buildSlotGroupNode(
        columnSlots[0]!,
        column,
        columns,
        slotBindings,
      );
      if (groupNode) {
        children.push(groupNode);
      }
      continue;
    }

    const stackChildren: LayoutNode[] = [];
    for (const slot of columnSlots) {
      const groupNode = buildSlotGroupNode(
        slot,
        column,
        columns,
        slotBindings,
      );
      if (groupNode) {
        stackChildren.push(groupNode);
      }
    }

    if (stackChildren.length === 0) {
      continue;
    }

    children.push({
      type: "stack",
      direction: "column",
      gap: 4,
      flex: 1,
      align: column === columns - 1 ? "end" : "start",
      children: stackChildren,
    });
  }

  return {
    root: {
      type: "grid",
      direction: "row",
      gap: 16,
      columns,
      align: "stretch",
      children,
    },
    slots: slotBindings,
    showActions: options?.showActions ?? true,
    ...(options?.cardsPerRow !== undefined
      ? { cardsPerRow: options.cardsPerRow }
      : {}),
  };
}

export function createDefaultCardViewConfig(
  fieldPaths: readonly string[],
): ViewConfig {
  const layout = createDefaultCardLayout(fieldPaths);
  return {
    type: "card",
    name: "card",
    fields: [...fieldPaths],
    layout,
  };
}
