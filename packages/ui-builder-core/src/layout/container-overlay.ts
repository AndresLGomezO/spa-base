import type { ImageComponentConfig } from "../types/component.js";
import { isContainerComponent } from "../types/component.js";
import type { RowNode } from "../types/layout.js";
import type { StyleRule, StylePropertyKey } from "../styles/style-types.js";
import {
  layoutInlineStyleFromStyleRules,
  type LayoutInlineStyle,
} from "../styles/apply-style-rules.js";

export interface ContainerOverlayContext {
  readonly hasOverlayImage: boolean;
  readonly overlayImageRowIds: ReadonlySet<string>;
}

export function readStylePropertyValue(
  styles: readonly StyleRule[] | undefined,
  property: StylePropertyKey,
): string | undefined {
  const rule = styles?.find((entry) => entry.property === property);
  return rule ? String(rule.value) : undefined;
}

export function hasStyleProperty(
  styles: readonly StyleRule[] | undefined,
  property: StylePropertyKey,
): boolean {
  return styles?.some((entry) => entry.property === property) ?? false;
}

export function isOverlayImageComponent(
  component: ImageComponentConfig,
): boolean {
  return component.displayMode === "overlay";
}

export function isOverlayImageRow(row: RowNode): boolean {
  return (
    row.type === "component" &&
    row.component.kind === "image" &&
    isOverlayImageComponent(row.component)
  );
}

export function collectOverlayImageRowIds(
  rows: readonly RowNode[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (isOverlayImageRow(row)) {
      ids.add(row.id);
    }
  }
  return ids;
}

export function containerHasOverlayImage(rows: readonly RowNode[]): boolean {
  return collectOverlayImageRowIds(rows).size > 0;
}

export function createContainerOverlayContext(
  rows: readonly RowNode[],
): ContainerOverlayContext {
  const overlayImageRowIds = collectOverlayImageRowIds(rows);
  return {
    hasOverlayImage: overlayImageRowIds.size > 0,
    overlayImageRowIds,
  };
}

function mergeStyleRulesByProperty(
  ...groups: readonly (readonly StyleRule[] | undefined)[]
): readonly StyleRule[] {
  const merged = new Map<StylePropertyKey, StyleRule>();
  for (const group of groups) {
    for (const rule of group ?? []) {
      merged.set(rule.property, rule);
    }
  }
  return [...merged.values()];
}

const OVERLAY_IMAGE_DEFAULTS: readonly StyleRule[] = [
  { property: "position", value: "absolute" },
  { property: "top", value: "0" },
  { property: "right", value: "0" },
  { property: "bottom", value: "0" },
  { property: "left", value: "0" },
  { property: "zIndex", value: "0" },
  { property: "pointerEvents", value: "none" },
];

const CONTENT_LAYER_DEFAULTS: readonly StyleRule[] = [
  { property: "position", value: "relative" },
  { property: "zIndex", value: "1" },
];

export function resolveImageComponentRowStyles(
  component: ImageComponentConfig,
): readonly StyleRule[] {
  if (!isOverlayImageComponent(component)) {
    return component.styles ?? [];
  }

  return mergeStyleRulesByProperty(OVERLAY_IMAGE_DEFAULTS, component.styles);
}

export function resolveContainerContentLayerRowStyles(
  rowStyles: readonly StyleRule[] | undefined,
  componentStyles: readonly StyleRule[] | undefined,
  overlayContext: ContainerOverlayContext,
  row: RowNode,
): readonly StyleRule[] | undefined {
  if (!overlayContext.hasOverlayImage || isOverlayImageRow(row)) {
    return rowStyles;
  }

  const defaultsToInject = CONTENT_LAYER_DEFAULTS.filter(
    (defaultRule) =>
      !hasStyleProperty(rowStyles, defaultRule.property) &&
      !hasStyleProperty(componentStyles, defaultRule.property),
  );

  if (defaultsToInject.length === 0) {
    return rowStyles;
  }

  return mergeStyleRulesByProperty(rowStyles, defaultsToInject);
}

export function resolveContainerShellOverlayStyle(
  styles: readonly StyleRule[] | undefined,
  rows: readonly RowNode[],
): LayoutInlineStyle {
  const base = layoutInlineStyleFromStyleRules(styles);
  if (!containerHasOverlayImage(rows)) {
    return base;
  }

  if (hasStyleProperty(styles, "position")) {
    return base;
  }

  return {
    ...base,
    position: "relative",
  };
}

export function containerRowsIncludeOverlayImage(
  rows: readonly RowNode[],
): boolean {
  for (const row of rows) {
    if (isOverlayImageRow(row)) {
      return true;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      if (containerHasOverlayImage(row.component.rows)) {
        return true;
      }
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        if (containerRowsIncludeOverlayImage(column.rows)) {
          return true;
        }
      }
    }
  }

  return false;
}
