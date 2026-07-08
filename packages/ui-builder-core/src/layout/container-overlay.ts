import type {
  ChartComponentConfig,
  ImageComponentConfig,
} from "../types/component.js";
import { isContainerComponent } from "../types/component.js";
import type { RowNode, UiLayoutDocument } from "../types/layout.js";
import { resolveLayoutRootColumns } from "./layout-root-adapters.js";
import type {
  StyleRule,
  StylePropertyKey,
  StyleBreakpoint,
} from "../styles/style-types.js";
import {
  layoutInlineStyleFromStyleRules,
  stylesIncludeFlexGrow,
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

export function containerUsesPercentHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return readPercentLengthValue(styles, "height") !== undefined;
}

function readPercentLengthValue(
  styles: readonly StyleRule[] | undefined,
  property: StylePropertyKey,
): number | undefined {
  const raw = readStylePropertyValue(styles, property);
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed.endsWith("%")) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed.slice(0, -1));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Container fills its parent (`height` / `minHeight` / `maxHeight` at 100%). */
export function containerUsesPercentFillHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  for (const property of ["height", "minHeight", "maxHeight"] as const) {
    if (readPercentLengthValue(styles, property) === 100) {
      return true;
    }
  }

  return false;
}

/** Container splits parent space by a percentage other than 100%. */
export function containerUsesPercentSplitHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return readPercentSplitLength(styles) !== undefined;
}

/** First non-100% `height` / `minHeight` / `maxHeight` percentage on the container. */
export function readPercentSplitLength(
  styles: readonly StyleRule[] | undefined,
): number | undefined {
  for (const property of ["height", "minHeight", "maxHeight"] as const) {
    const percent = readPercentLengthValue(styles, property);
    if (percent !== undefined && percent !== 100) {
      return percent;
    }
  }

  return undefined;
}

/** Flex-basis split for column stacks (`flex: 0 0 60%`). */
export function resolveContainerPercentSplitFlexStyle(
  styles: readonly StyleRule[] | undefined,
): Pick<LayoutInlineStyle, "flex" | "minHeight"> | undefined {
  const percent = readPercentSplitLength(styles);
  if (percent === undefined) {
    return undefined;
  }

  return {
    flex: `0 0 ${percent}%`,
    minHeight: "0",
  };
}

function stripPercentLengthStyles(style: LayoutInlineStyle): LayoutInlineStyle {
  const next = { ...style };

  if (next.height?.endsWith("%")) {
    delete next.height;
  }

  if (next.minHeight?.endsWith("%")) {
    delete next.minHeight;
  }

  if (next.maxHeight?.endsWith("%")) {
    delete next.maxHeight;
  }

  return next;
}

/** True when the container has a non-percentage height (e.g. `200px`). */
export function containerHasFixedExplicitHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (
    hasStyleProperty(styles, "height") && !containerUsesPercentHeight(styles)
  );
}

export function containerHasPixelMinHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  const raw = readStylePropertyValue(styles, "minHeight");
  if (raw === undefined) {
    return false;
  }

  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    return false;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed) && parsed === 0) {
    return false;
  }

  return true;
}

/** Fixed `height` or pixel `minHeight` — enough for percentage children to resolve against. */
export function containerEstablishesDefiniteHeight(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (
    containerHasFixedExplicitHeight(styles) ||
    containerHasPixelMinHeight(styles)
  );
}

function rowEstablishesDefiniteHeight(row: RowNode): boolean {
  if (row.type !== "component" || !isContainerComponent(row.component)) {
    return false;
  }

  return containerEstablishesDefiniteHeight(row.component.styles);
}

/** True when any root-column row is a container with pixel/fixed height. */
export function layoutEstablishesDefiniteHeight(
  layout: UiLayoutDocument,
): boolean {
  for (const column of resolveLayoutRootColumns(layout)) {
    for (const row of column.rows) {
      if (rowEstablishesDefiniteHeight(row)) {
        return true;
      }
    }
  }

  return false;
}

function containerRowUsesPercentSplit(row: RowNode): boolean {
  return (
    row.type === "component" &&
    isContainerComponent(row.component) &&
    containerUsesPercentSplitHeight(row.component.styles)
  );
}

/** True when a column stack includes at least one percent-height split container row. */
export function columnStackHasPercentSplitContainer(
  rows: readonly RowNode[],
): boolean {
  return rows.some(containerRowUsesPercentSplit);
}

/**
 * Flex class for container rows that share a column stack with a percent-split
 * sibling. Non-split rows grow to fill the remaining space (matches preview chrome).
 */
export function resolvePercentSplitSiblingContainerClass(
  row: RowNode,
  stackDirection: "column" | "row",
  siblingRows: readonly RowNode[],
): string | undefined {
  if (
    stackDirection !== "column" ||
    row.type !== "component" ||
    !isContainerComponent(row.component) ||
    !columnStackHasPercentSplitContainer(siblingRows)
  ) {
    return undefined;
  }

  const styles = row.component.styles;
  if (
    containerUsesPercentSplitHeight(styles) ||
    containerUsesPercentFillHeight(styles) ||
    containerEstablishesDefiniteHeight(styles) ||
    stylesIncludeFlexGrow(styles)
  ) {
    return undefined;
  }

  return "flex min-h-0 flex-1 w-full min-w-0 flex-col";
}

export function isOverlayImageComponent(
  component: ImageComponentConfig,
): boolean {
  return component.displayMode === "overlay";
}

export function isOverlayChartComponent(
  component: ChartComponentConfig,
): boolean {
  const styles = component.styles ?? [];
  if (
    styles.some(
      (rule) =>
        rule.property === "position" &&
        String(rule.value).trim() === "absolute",
    )
  ) {
    return true;
  }
  return styles.some(
    (rule) =>
      rule.property === "pointerEvents" && String(rule.value).trim() === "none",
  );
}

function isOverlayDecorativeComponent(
  component: ImageComponentConfig | ChartComponentConfig,
): boolean {
  if (component.kind === "image") {
    return component.displayMode === "overlay";
  }
  return isOverlayChartComponent(component);
}

export function isOverlayImageRow(row: RowNode): boolean {
  if (row.type !== "component") {
    return false;
  }

  if (row.component.kind === "image") {
    return isOverlayImageComponent(row.component);
  }

  if (row.component.kind === "chart") {
    return isOverlayChartComponent(row.component);
  }

  return false;
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

function sanitizeOverlayComponentStyles(
  styles: readonly StyleRule[] | undefined,
): readonly StyleRule[] {
  return (styles ?? []).filter(
    (rule) =>
      !(rule.property === "top" && String(rule.value).trim() === "auto"),
  );
}

export function resolveOverlayComponentRowStyles(
  component: ImageComponentConfig | ChartComponentConfig,
): readonly StyleRule[] {
  if (!isOverlayDecorativeComponent(component)) {
    return component.styles ?? [];
  }

  return mergeStyleRulesByProperty(
    OVERLAY_IMAGE_DEFAULTS,
    sanitizeOverlayComponentStyles(component.styles),
  );
}

export function resolveImageComponentRowStyles(
  component: ImageComponentConfig,
): readonly StyleRule[] {
  return resolveOverlayComponentRowStyles(component);
}

export function resolveChartComponentRowStyles(
  component: ChartComponentConfig,
): readonly StyleRule[] {
  return resolveOverlayComponentRowStyles(component);
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
  atBreakpoint?: StyleBreakpoint,
): LayoutInlineStyle {
  const base = layoutInlineStyleFromStyleRules(styles, atBreakpoint);
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

/** Container shell inline styles, promoting pixel `minHeight` to `height` when needed for % children. */
export function resolveContainerShellLayoutStyle(
  styles: readonly StyleRule[] | undefined,
  rows: readonly RowNode[],
  options?: {
    readonly parentStackDirection?: "column" | "row";
    readonly applyPercentSplitFlex?: boolean;
    readonly atBreakpoint?: StyleBreakpoint;
  },
): LayoutInlineStyle {
  const atBreakpoint = options?.atBreakpoint;
  let base = resolveContainerShellOverlayStyle(styles, rows, atBreakpoint);

  if (base.height === undefined && containerHasPixelMinHeight(styles)) {
    const minHeight = layoutInlineStyleFromStyleRules(
      styles,
      atBreakpoint,
    ).minHeight;
    if (minHeight !== undefined) {
      base = { ...base, height: minHeight };
    }
  }

  const parentStackDirection = options?.parentStackDirection ?? "column";
  if (parentStackDirection === "column" && readPercentSplitLength(styles)) {
    if (options?.applyPercentSplitFlex !== false) {
      const splitFlex = resolveContainerPercentSplitFlexStyle(styles);
      if (splitFlex) {
        return {
          ...stripPercentLengthStyles(base),
          ...splitFlex,
        };
      }
    }

    return {
      ...stripPercentLengthStyles(base),
      height: "100%",
    };
  }

  return base;
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
  }

  return false;
}
