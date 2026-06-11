import {
  RESPONSIVE_GRID_STYLE_PROPERTIES,
  buildAutoDefaultGridCounts,
  type ResponsiveGridBreakpoint,
  type StylePropertyKey,
  type StyleRule,
} from "@repo/ui-builder-core";

export type ResponsiveGridEditorMode = "auto" | "custom" | "autoFit" | "fixed";

export interface ResponsiveGridEditorLabels {
  readonly title: string;
  readonly mode: string;
  readonly modeAuto: string;
  readonly modeCustom: string;
  readonly modeAutoFit: string;
  readonly modeFixed: string;
  readonly autoFitMinWidth: string;
  readonly breakpointBase: string;
  readonly breakpointSm: string;
  readonly breakpointMd: string;
  readonly breakpointLg: string;
  readonly breakpointXl: string;
  readonly breakpointShortBase: string;
  readonly breakpointShortSm: string;
  readonly breakpointShortMd: string;
  readonly breakpointShortLg: string;
  readonly breakpointShortXl: string;
}

const GRID_COLUMNS_PROPERTIES = [
  "gridColumns",
  "gridColumnsSm",
  "gridColumnsMd",
  "gridColumnsLg",
  "gridColumnsXl",
] as const satisfies readonly StylePropertyKey[];

const BREAKPOINT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  keyof ResponsiveGridEditorLabels
> = {
  base: "breakpointBase",
  sm: "breakpointSm",
  md: "breakpointMd",
  lg: "breakpointLg",
  xl: "breakpointXl",
};

const GRID_COLUMNS_PROPERTY_BY_BREAKPOINT: Record<
  ResponsiveGridBreakpoint,
  (typeof GRID_COLUMNS_PROPERTIES)[number]
> = {
  base: "gridColumns",
  sm: "gridColumnsSm",
  md: "gridColumnsMd",
  lg: "gridColumnsLg",
  xl: "gridColumnsXl",
};

function readStyleValue(
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

function withoutResponsiveGridStyles(
  styles: readonly StyleRule[] | undefined,
): StyleRule[] {
  return (styles ?? []).filter(
    (rule) => !RESPONSIVE_GRID_STYLE_PROPERTIES.has(rule.property),
  );
}

function upsertStyleRule(
  styles: readonly StyleRule[],
  property: StylePropertyKey,
  value: string,
): StyleRule[] {
  const index = styles.findIndex((rule) => rule.property === property);
  if (index === -1) {
    return [...styles, { property, value }];
  }
  const next = [...styles];
  next[index] = { property, value };
  return next;
}

export function isResponsiveGridStyleProperty(
  property: StylePropertyKey,
): boolean {
  return RESPONSIVE_GRID_STYLE_PROPERTIES.has(property);
}

export function filterStyleRulesForGenericEditor(
  styles: readonly StyleRule[] | undefined,
): StyleRule[] {
  return (styles ?? []).filter(
    (rule) => !isResponsiveGridStyleProperty(rule.property),
  );
}

export function inferResponsiveGridEditorMode(
  styles: readonly StyleRule[] | undefined,
): ResponsiveGridEditorMode {
  if (readStyleValue(styles, "gridAutoFitMinWidth")) {
    return "autoFit";
  }
  if (readStyleValue(styles, "gridResponsiveMode") === "fixed") {
    return "fixed";
  }
  if (
    GRID_COLUMNS_PROPERTIES.some((property) => readStyleValue(styles, property))
  ) {
    return "custom";
  }
  return "auto";
}

export function readResponsiveGridCounts(
  styles: readonly StyleRule[] | undefined,
  columnCount: number,
): Record<ResponsiveGridBreakpoint, string> {
  const defaults = buildAutoDefaultGridCounts(columnCount);
  return {
    base: readStyleValue(styles, "gridColumns") ?? String(defaults.base),
    sm: readStyleValue(styles, "gridColumnsSm") ?? String(defaults.sm),
    md: readStyleValue(styles, "gridColumnsMd") ?? String(defaults.md),
    lg: readStyleValue(styles, "gridColumnsLg") ?? String(defaults.lg),
    xl: readStyleValue(styles, "gridColumnsXl") ?? String(defaults.xl),
  };
}

export function buildResponsiveGridStyles(options: {
  readonly currentStyles: readonly StyleRule[] | undefined;
  readonly mode: ResponsiveGridEditorMode;
  readonly columnCount: number;
  readonly counts?: Partial<Record<ResponsiveGridBreakpoint, string>>;
  readonly autoFitMinWidth?: string;
}): StyleRule[] {
  const baseStyles = withoutResponsiveGridStyles(options.currentStyles);

  if (options.mode === "fixed") {
    return [...baseStyles, { property: "gridResponsiveMode", value: "fixed" }];
  }

  if (options.mode === "autoFit") {
    const minWidth = options.autoFitMinWidth?.trim() || "280";
    return [
      ...baseStyles,
      { property: "gridAutoFitMinWidth", value: minWidth },
    ];
  }

  if (options.mode === "auto") {
    return baseStyles;
  }

  const defaults = buildAutoDefaultGridCounts(options.columnCount);
  let next = baseStyles;
  for (const breakpoint of Object.keys(
    GRID_COLUMNS_PROPERTY_BY_BREAKPOINT,
  ) as ResponsiveGridBreakpoint[]) {
    const property = GRID_COLUMNS_PROPERTY_BY_BREAKPOINT[breakpoint];
    const raw =
      options.counts?.[breakpoint]?.trim() || String(defaults[breakpoint]);
    next = upsertStyleRule(next, property, raw);
  }
  return next;
}

export function applyStackOnMobilePreset(
  styles: readonly StyleRule[] | undefined,
  columnCount: number,
): StyleRule[] {
  const baseStyles = withoutResponsiveGridStyles(styles);
  const max = Math.max(1, columnCount);
  return [
    ...baseStyles,
    { property: "gridColumns", value: "1" },
    { property: "gridColumnsMd", value: String(max) },
  ];
}

export { BREAKPOINT_LABEL_KEYS, GRID_COLUMNS_PROPERTY_BY_BREAKPOINT };
