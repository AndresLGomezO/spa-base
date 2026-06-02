import type {
  CardBadgeVariant,
  CardLayoutConfig,
  CardSlotBinding,
  CardSlotComponentType,
  LayoutAlign,
  LayoutJustify,
  LayoutNode,
  MetricBindingSource,
  ViewConfig,
} from "@repo/entities";
import { isCardMetricKpiBinding } from "@repo/entities";
import { createDefaultCardLayout } from "@repo/ui";

export type BuilderSlotHorizontalAlign = LayoutAlign;
export type BuilderSlotVerticalAlign = Exclude<LayoutJustify, "between">;

export interface BuilderSlotDraft {
  readonly slotId: string;
  readonly fieldPath: string;
  readonly component: CardSlotComponentType;
  readonly metricDefinitionId?: string;
  readonly groupBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly column: number;
  readonly order: number;
  readonly align?: BuilderSlotHorizontalAlign;
  readonly justify?: BuilderSlotVerticalAlign;
  readonly showLabel?: boolean;
  readonly label?: string;
  readonly className?: string;
  readonly imageSize?: number;
  readonly textSize?: number;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  /** In-progress rules in the builder (may include empty match values). */
  readonly badgeVariantRules?: readonly BadgeVariantRule[];
}

export interface BadgeVariantRule {
  readonly matchValue: string;
  readonly variant: CardBadgeVariant;
}

const SLOT_ID_NUMERIC_SUFFIX = /^slot-(\d+)$/;

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

export function createBuilderSlotsFromLayout(
  layout: CardLayoutConfig,
): readonly BuilderSlotDraft[] {
  const columnBySlot = new Map<string, number>();
  const orderBySlot = new Map<string, number>();
  const alignBySlot = new Map<string, LayoutAlign>();
  const justifyBySlot = new Map<string, BuilderSlotVerticalAlign>();

  function walkColumns(node: LayoutNode, columnIndex: number): void {
    if (node.type === "slot") {
      columnBySlot.set(node.slotId, columnIndex);
      orderBySlot.set(
        node.slotId,
        orderBySlot.has(node.slotId)
          ? (orderBySlot.get(node.slotId) ?? 0)
          : orderBySlot.size,
      );
      if (node.align) {
        alignBySlot.set(node.slotId, node.align);
      }
      if (node.justify && node.justify !== "between") {
        justifyBySlot.set(node.slotId, node.justify);
      }
      return;
    }

    node.children.forEach((child, index) => {
      walkColumns(child, node.type === "grid" ? index : columnIndex);
    });
  }

  walkColumns(layout.root, 0);

  return Object.entries(layout.slots).map(([slotId, binding], index) => {
    const isLegacyLabeledText = binding.component === "labeled-text";
    const isMetricKpi = isCardMetricKpiBinding(binding);

    return {
      slotId,
      fieldPath: isMetricKpi ? "" : binding.fieldPath,
      component: isLegacyLabeledText ? "text" : binding.component,
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
      column: columnBySlot.get(slotId) ?? 0,
      order: orderBySlot.get(slotId) ?? index,
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
            ...("className" in binding && binding.className
              ? { className: binding.className }
              : {}),
            ...("imageSize" in binding && binding.imageSize !== undefined
              ? { imageSize: binding.imageSize }
              : {}),
            ...("textSize" in binding && binding.textSize !== undefined
              ? { textSize: binding.textSize }
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
      ...(alignBySlot.has(slotId) ? { align: alignBySlot.get(slotId) } : {}),
      ...(justifyBySlot.has(slotId)
        ? { justify: justifyBySlot.get(slotId) }
        : {}),
    };
  });
}

function bindingFromSlot(slot: BuilderSlotDraft): CardSlotBinding {
  if (slot.component === "metric-kpi") {
    return {
      component: "metric-kpi",
      metricDefinitionId: slot.metricDefinitionId ?? "",
      groupBindings: slot.groupBindings ?? {},
      dimensionBindings: slot.dimensionBindings ?? {},
      ...(slot.label ? { label: slot.label } : {}),
      ...(slot.className ? { className: slot.className } : {}),
      ...(slot.textSize !== undefined ? { textSize: slot.textSize } : {}),
      ...(slot.textBold !== undefined ? { textBold: slot.textBold } : {}),
    };
  }

  const badgeVariants = badgeVariantMapFromRules(slot.badgeVariantRules ?? []);

  return {
    component: slot.component,
    fieldPath: slot.fieldPath,
    ...(slot.showLabel !== undefined ? { showLabel: slot.showLabel } : {}),
    ...(slot.label ? { label: slot.label } : {}),
    ...(slot.className ? { className: slot.className } : {}),
    ...(slot.imageSize !== undefined ? { imageSize: slot.imageSize } : {}),
    ...(slot.textSize !== undefined ? { textSize: slot.textSize } : {}),
    ...(slot.textThin ? { textThin: true } : {}),
    ...(slot.textBold ? { textBold: true } : {}),
    ...(slot.textItalic ? { textItalic: true } : {}),
    ...(slot.textUnderline ? { textUnderline: true } : {}),
    ...(badgeVariants ? { badgeVariants } : {}),
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
      const slot = columnSlots[0]!;
      slotBindings[slot.slotId] = bindingFromSlot(slot);
      children.push({
        type: "slot",
        slotId: slot.slotId,
        align: resolveSlotNodeAlign(slot, column, columns),
        ...(slot.justify ? { justify: slot.justify } : {}),
        flex: 1,
      });
      continue;
    }

    const stackChildren: LayoutNode[] = columnSlots.map((slot) => {
      slotBindings[slot.slotId] = bindingFromSlot(slot);
      return {
        type: "slot" as const,
        slotId: slot.slotId,
        ...(slot.align ? { align: slot.align } : {}),
        ...(slot.justify ? { justify: slot.justify } : {}),
      };
    });

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
      align: "center",
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
