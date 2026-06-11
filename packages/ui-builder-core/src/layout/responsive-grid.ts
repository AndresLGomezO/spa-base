import type { StylePropertyKey, StyleRule } from "../styles/style-types.js";

export const MAX_GRID_COLUMNS = 6;

export const RESPONSIVE_GRID_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
  "gridAutoFitMinWidth",
  "gridResponsiveMode",
]);

export type ResponsiveGridBreakpoint = "base" | "sm" | "md" | "lg" | "xl";

export type ResponsiveGridMode = "fixed" | "responsive" | "autoFit";

export interface ResponsiveGridBreakpointCounts {
  readonly base: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
}

export interface ResolveResponsiveGridLayoutOptions {
  readonly styles: readonly StyleRule[] | undefined;
  readonly columnCount: number;
  readonly slotCount: number;
  /** When set, returns a single grid-cols class for this breakpoint (preview mode). */
  readonly atBreakpoint?: ResponsiveGridBreakpoint;
}

export const RESPONSIVE_BREAKPOINT_ORDER: readonly ResponsiveGridBreakpoint[] =
  ["base", "sm", "md", "lg", "xl"];

export const RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS: Record<
  ResponsiveGridBreakpoint,
  number
> = {
  base: 390,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export interface ResolvedResponsiveGridLayout {
  readonly mode: ResponsiveGridMode;
  readonly className?: string;
  readonly columnsTemplate?: string;
}

const GRID_COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const RESPONSIVE_BREAKPOINTS = [
  { key: "base" as const, prefix: "" },
  { key: "sm" as const, prefix: "sm:" },
  { key: "md" as const, prefix: "md:" },
  { key: "lg" as const, prefix: "lg:" },
  { key: "xl" as const, prefix: "xl:" },
] as const;

const GRID_COLUMNS_PROPERTY_BY_BREAKPOINT: Record<
  ResponsiveGridBreakpoint,
  StylePropertyKey
> = {
  base: "gridColumns",
  sm: "gridColumnsSm",
  md: "gridColumnsMd",
  lg: "gridColumnsLg",
  xl: "gridColumnsXl",
};

function styleValue(
  styles: readonly StyleRule[] | undefined,
  property: StylePropertyKey,
): string | undefined {
  const rule = styles?.find((entry) => entry.property === property);
  if (!rule) {
    return undefined;
  }
  const raw = String(rule.value).trim();
  return raw.length > 0 ? raw : undefined;
}

function parseColumnCount(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.min(MAX_GRID_COLUMNS, Math.max(1, parsed));
}

function clampColumnCount(
  value: number,
  columnCount: number,
  slotCount: number,
): number {
  const max = Math.min(
    MAX_GRID_COLUMNS,
    Math.max(1, columnCount),
    Math.max(1, slotCount),
  );
  return Math.min(max, Math.max(1, value));
}

export function hasExplicitResponsiveGridColumns(
  styles: readonly StyleRule[] | undefined,
): boolean {
  for (const property of RESPONSIVE_GRID_STYLE_PROPERTIES) {
    if (
      property === "gridAutoFitMinWidth" ||
      property === "gridResponsiveMode"
    ) {
      continue;
    }
    if (styleValue(styles, property) !== undefined) {
      return true;
    }
  }
  return false;
}

export function parseGridAutoFitMinWidth(
  styles: readonly StyleRule[] | undefined,
): number | undefined {
  const raw = styleValue(styles, "gridAutoFitMinWidth");
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

export function parseGridResponsiveMode(
  styles: readonly StyleRule[] | undefined,
): "auto" | "fixed" | undefined {
  const raw = styleValue(styles, "gridResponsiveMode");
  if (raw === "fixed" || raw === "auto") {
    return raw;
  }
  return undefined;
}

export function buildAutoDefaultGridCounts(
  columnCount: number,
): ResponsiveGridBreakpointCounts {
  const max = Math.min(MAX_GRID_COLUMNS, Math.max(1, columnCount));
  return {
    base: 1,
    sm: Math.min(2, max),
    md: Math.min(2, max),
    lg: Math.min(3, max),
    xl: max,
  };
}

export function resolveResponsiveGridCounts(
  styles: readonly StyleRule[] | undefined,
  columnCount: number,
  slotCount: number,
): ResponsiveGridBreakpointCounts {
  const defaults = buildAutoDefaultGridCounts(columnCount);
  const resolved: Record<ResponsiveGridBreakpoint, number> = { ...defaults };

  for (const { key } of RESPONSIVE_BREAKPOINTS) {
    const property = GRID_COLUMNS_PROPERTY_BY_BREAKPOINT[key];
    const explicit = parseColumnCount(styleValue(styles, property));
    if (explicit !== undefined) {
      resolved[key] = clampColumnCount(explicit, columnCount, slotCount);
    } else {
      resolved[key] = clampColumnCount(resolved[key], columnCount, slotCount);
    }
  }

  return resolved;
}

export function buildResponsiveGridClassName(
  counts: ResponsiveGridBreakpointCounts,
): string {
  const classes: string[] = [];
  let previousCols: number | undefined;

  for (const { key, prefix } of RESPONSIVE_BREAKPOINTS) {
    const cols = counts[key];
    if (previousCols === cols) {
      continue;
    }
    previousCols = cols;

    const colClass = GRID_COLS_CLASS[cols];
    if (!colClass) {
      continue;
    }

    classes.push(prefix ? `${prefix}${colClass}` : colClass);
  }

  return classes.join(" ");
}

export function buildResponsiveGridClassNameAtBreakpoint(
  counts: ResponsiveGridBreakpointCounts,
  atBreakpoint: ResponsiveGridBreakpoint,
): string {
  const cols = counts[atBreakpoint];
  return GRID_COLS_CLASS[cols] ?? "grid-cols-1";
}

export function buildAutoFitGridTemplate(minWidthPx: number): string {
  return `repeat(auto-fit, minmax(min(100%, ${minWidthPx}px), 1fr))`;
}

export function usesResponsiveGridLayout(
  styles: readonly StyleRule[] | undefined,
  columnCount: number,
): boolean {
  return (
    resolveResponsiveGridLayout({
      styles,
      columnCount,
      slotCount: columnCount,
    }).mode !== "fixed"
  );
}

export function resolveResponsiveGridLayout(
  options: ResolveResponsiveGridLayoutOptions,
): ResolvedResponsiveGridLayout {
  const { styles, columnCount, slotCount, atBreakpoint } = options;
  const effectiveSlotCount = Math.max(1, slotCount);
  const effectiveColumnCount = Math.max(1, columnCount);

  const autoFitMinWidth = parseGridAutoFitMinWidth(styles);
  if (autoFitMinWidth !== undefined) {
    return {
      mode: "autoFit",
      columnsTemplate: buildAutoFitGridTemplate(autoFitMinWidth),
    };
  }

  if (
    parseGridResponsiveMode(styles) === "fixed" ||
    effectiveColumnCount === 1
  ) {
    return { mode: "fixed" };
  }

  if (
    effectiveColumnCount >= 2 &&
    (hasExplicitResponsiveGridColumns(styles) ||
      parseGridResponsiveMode(styles) !== "fixed")
  ) {
    const counts = resolveResponsiveGridCounts(
      styles,
      effectiveColumnCount,
      effectiveSlotCount,
    );
    return {
      mode: "responsive",
      className:
        atBreakpoint !== undefined
          ? buildResponsiveGridClassNameAtBreakpoint(counts, atBreakpoint)
          : buildResponsiveGridClassName(counts),
    };
  }

  return { mode: "fixed" };
}

/** Tailwind safelist: keep responsive grid utilities in the CSS bundle. */
export const RESPONSIVE_GRID_TAILWIND_SAFELIST = [
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
  "grid-cols-5",
  "grid-cols-6",
  "sm:grid-cols-1",
  "sm:grid-cols-2",
  "sm:grid-cols-3",
  "sm:grid-cols-4",
  "sm:grid-cols-5",
  "sm:grid-cols-6",
  "md:grid-cols-1",
  "md:grid-cols-2",
  "md:grid-cols-3",
  "md:grid-cols-4",
  "md:grid-cols-5",
  "md:grid-cols-6",
  "lg:grid-cols-1",
  "lg:grid-cols-2",
  "lg:grid-cols-3",
  "lg:grid-cols-4",
  "lg:grid-cols-5",
  "lg:grid-cols-6",
  "xl:grid-cols-1",
  "xl:grid-cols-2",
  "xl:grid-cols-3",
  "xl:grid-cols-4",
  "xl:grid-cols-5",
  "xl:grid-cols-6",
] as const;
