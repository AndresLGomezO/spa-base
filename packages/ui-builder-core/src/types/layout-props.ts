/**
 * Separates layout-affecting properties from visual style properties.
 * @see docs/guides/advanced-ui-builder.md §8
 */
import type { StylePropertyKey, StyleRule } from "../styles/style-types.js";
import type { LayoutAlign, ColumnStackDirection } from "./layout.js";
import type { ResponsiveGridBreakpoint } from "../layout/responsive-grid.js";

export interface LayoutProps {
  readonly gridTemplateColumns?: string;
  readonly gap?: string;
  readonly alignItems?: LayoutAlign;
  readonly stackDirection?: ColumnStackDirection;
  readonly widthPercent?: number;
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
}

/** Style properties that affect layout positioning — excluded from visual style editor at root. */
export const LAYOUT_STYLE_PROPERTIES: ReadonlySet<StylePropertyKey> = new Set([
  "alignItems",
  "justifyContent",
  "alignSelf",
  "flex",
  "flexWrap",
  "gap",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
  "gridAutoFitMinWidth",
  "gridResponsiveMode",
  "gridColumn",
  "gridRow",
]);

export function isLayoutStyleProperty(property: StylePropertyKey): boolean {
  return LAYOUT_STYLE_PROPERTIES.has(property);
}

export function filterLayoutStyleRules(
  rules: readonly StyleRule[],
): readonly StyleRule[] {
  return rules.filter((rule) => isLayoutStyleProperty(rule.property));
}

export function filterVisualStyleRules(
  rules: readonly StyleRule[],
): readonly StyleRule[] {
  return rules.filter((rule) => !isLayoutStyleProperty(rule.property));
}

export function stripGapStyleRules(
  rules: readonly StyleRule[] | undefined,
): StyleRule[] {
  return (rules ?? []).filter((rule) => rule.property !== "gap");
}

/** Reads the editable grid gap from component props and legacy style-rule locations. */
export function readGridGapEditorValue(
  gap: string | undefined,
  componentStyles?: readonly StyleRule[],
  rowStyles?: readonly StyleRule[],
): string {
  const trimmedGap = gap?.trim();
  if (trimmedGap) {
    return trimmedGap;
  }

  const componentGap = componentStyles?.find(
    (rule) => rule.property === "gap",
  )?.value;
  if (componentGap != null && String(componentGap).trim().length > 0) {
    return String(componentGap).trim();
  }

  const rowGap = rowStyles?.find((rule) => rule.property === "gap")?.value;
  if (rowGap != null && String(rowGap).trim().length > 0) {
    return String(rowGap).trim();
  }

  return "";
}

export type StyleProps = readonly StyleRule[];
