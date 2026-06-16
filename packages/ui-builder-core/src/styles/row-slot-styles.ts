import type { StylePropertyKey, StyleRule } from "./style-types.js";
import {
  resolveRowWrapperStyleRules,
  type ResolvedStyleRules,
} from "./apply-style-rules.js";

/** Applied on the layout row wrapper, not the inner component node. */
export const ROW_SLOT_HOISTED_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "overflowX",
  "overflowY",
]);

export function isRowSlotHoistedStyleProperty(
  property: StylePropertyKey,
): boolean {
  return ROW_SLOT_HOISTED_STYLE_PROPERTIES.has(property);
}

export function filterHoistedRowSlotStyleRules(
  styles: readonly StyleRule[] | undefined,
): readonly StyleRule[] {
  return (styles ?? []).filter((rule) =>
    isRowSlotHoistedStyleProperty(rule.property),
  );
}

export function filterComponentInnerStyleRules(
  styles: readonly StyleRule[] | undefined,
): readonly StyleRule[] {
  return (styles ?? []).filter(
    (rule) => !isRowSlotHoistedStyleProperty(rule.property),
  );
}

export function mergeRowWrapperStyles(
  rowStyles: readonly StyleRule[] | undefined,
  componentStyles: readonly StyleRule[] | undefined,
): ResolvedStyleRules {
  const hoisted = new Map<StylePropertyKey, StyleRule>();

  for (const rule of filterHoistedRowSlotStyleRules(componentStyles)) {
    hoisted.set(rule.property, rule);
  }
  for (const rule of filterHoistedRowSlotStyleRules(rowStyles)) {
    hoisted.set(rule.property, rule);
  }

  const nonHoistedRow = (rowStyles ?? []).filter(
    (rule) => !isRowSlotHoistedStyleProperty(rule.property),
  );

  return resolveRowWrapperStyleRules([...nonHoistedRow, ...hoisted.values()]);
}
