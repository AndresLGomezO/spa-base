import {
  COLOR_SCALE_STEPS,
  isColorScaleStep,
  type ColorScaleStep,
} from "./palette/scale-steps.js";
import {
  DEFAULT_NEUTRAL_SCALE,
  DEFAULT_PRIMARY_SCALE,
  getDefaultReferenceScale,
  type PaletteKind,
} from "./palette/default-scales.js";
import {
  expandAppearancePalettes,
  expandPaletteConfig,
  generateColorScale,
  inferPaletteFromLegacyColors,
  isPaletteCssVar,
  normalizeHexColor,
  paletteToCssVariables,
  type ColorPaletteConfig,
} from "./palette/generate-scale.js";
import {
  applyAppearancePreset,
  type AppearancePreset,
} from "./presets/index.js";
import {
  expandAppearanceSemantics,
  expandSchemeColors,
  stripSidebarVars,
  type AppearanceColorScheme,
} from "./semantics/resolve-semantics.js";
import {
  hasPaletteScaleVariables,
  resolveSemanticsFromPalette,
} from "./semantics/resolve-from-palette.js";
import {
  BADGE_SEMANTIC_CSS_VARS,
  CHART_COLOR_CSS_VARS,
  EFFECT_SEMANTIC_CSS_VARS,
  LAYOUT_RADIUS_CSS_VARS,
  LAYOUT_SPACING_CSS_VARS,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
} from "./semantics/semantic-vars.js";

export const TENANT_THEME_EXPORT_VERSION = 1;

export const PRIMARY_SCALE_STEPS = COLOR_SCALE_STEPS;
export const NEUTRAL_SCALE_STEPS = COLOR_SCALE_STEPS;

export const COLOR_PALETTE_CSS_VAR_PREFIXES = [
  "--color-primary-",
  "--color-neutral-",
] as const;

const PRIMARY_CSS_VARS = COLOR_SCALE_STEPS.map(
  (step) => `--color-primary-${step}` as const,
);
const NEUTRAL_CSS_VARS = COLOR_SCALE_STEPS.map(
  (step) => `--color-neutral-${step}` as const,
);

export const TENANT_OVERRIDABLE_CSS_VARS = [
  ...PRIMARY_CSS_VARS,
  ...NEUTRAL_CSS_VARS,
  ...SEMANTIC_OVERRIDABLE_CSS_VARS,
  ...EFFECT_SEMANTIC_CSS_VARS,
  ...CHART_COLOR_CSS_VARS,
  ...LAYOUT_RADIUS_CSS_VARS,
  "--color-sidebar",
  "--color-sidebar-foreground",
  "--color-sidebar-border",
  "--color-sidebar-highlight",
  "--color-sidebar-hover",
  "--color-sidebar-accent",
  "--color-sidebar-accent-foreground",
  "--font-sans",
  "--text-body",
  "--text-body--line-height",
  "--text-heading",
  "--text-heading--line-height",
  "--radius-md",
  ...LAYOUT_SPACING_CSS_VARS,
  "--sidebar-width",
] as const;

export type TenantOverridableCssVar =
  (typeof TENANT_OVERRIDABLE_CSS_VARS)[number];

export const TENANT_OVERRIDE_GROUPS = {
  primary: PRIMARY_CSS_VARS,
  neutral: NEUTRAL_CSS_VARS,
  semantics: SEMANTIC_OVERRIDABLE_CSS_VARS.filter(
    (cssVar) =>
      !(BADGE_SEMANTIC_CSS_VARS as readonly string[]).includes(cssVar),
  ),
  badge: BADGE_SEMANTIC_CSS_VARS,
  sidebar: [
    "--color-sidebar",
    "--color-sidebar-foreground",
    "--color-sidebar-border",
    "--color-sidebar-highlight",
    "--color-sidebar-hover",
    "--color-sidebar-accent",
    "--color-sidebar-accent-foreground",
    "--sidebar-width",
  ],
  effects: EFFECT_SEMANTIC_CSS_VARS,
  charts: CHART_COLOR_CSS_VARS,
  typography: [
    "--font-sans",
    "--text-body",
    "--text-body--line-height",
    "--text-heading",
    "--text-heading--line-height",
  ],
  layout: [
    ...LAYOUT_RADIUS_CSS_VARS,
    ...LAYOUT_SPACING_CSS_VARS,
    "--sidebar-width",
  ],
} as const satisfies Record<string, readonly TenantOverridableCssVar[]>;

export interface TenantAppearanceEffectsLike {
  readonly shadowCard?: {
    readonly light?: string;
    readonly dark?: string;
  };
  readonly gradientPrimary?: {
    readonly light?: string;
    readonly dark?: string;
  };
}

export interface TenantChartColorsLike {
  readonly chart1?: string;
  readonly chart2?: string;
  readonly chart3?: string;
  readonly chart4?: string;
}

export interface TenantAppearanceLike {
  readonly preset?: AppearancePreset;
  readonly colors?: Readonly<Record<string, string>>;
  readonly colorsByScheme?: {
    readonly light?: Readonly<Record<string, string>>;
    readonly dark?: Readonly<Record<string, string>>;
  };
  readonly palettes?: {
    readonly primary?: ColorPaletteConfig;
    readonly neutral?: ColorPaletteConfig;
  };
  readonly semantics?: Readonly<Record<string, string>>;
  readonly semanticsByScheme?: {
    readonly light?: Readonly<Record<string, string>>;
    readonly dark?: Readonly<Record<string, string>>;
  };
  readonly effects?: TenantAppearanceEffectsLike;
  readonly chartColors?: TenantChartColorsLike;
  readonly fontFamily?: string;
  readonly fontSizes?: {
    readonly body?: string;
    readonly heading?: string;
  };
  readonly radius?: string;
  readonly radiusSm?: string;
  /** @deprecated Use spacingScale.base for macro layout spacing. */
  readonly spacing?: string;
  readonly spacingScale?: {
    readonly xs?: string;
    readonly sm?: string;
    readonly md?: string;
    readonly base?: string;
    readonly lg?: string;
  };
}

export interface AppearanceToCssVariablesOptions {
  readonly colorScheme?: AppearanceColorScheme;
  /**
   * When true, always inlines full light/dark semantics for a nested preview scope.
   * Uses default palette scales when the tenant has no custom palettes.
   */
  readonly scopedPreview?: boolean;
}

function defaultPaletteScaleVariables(): Record<string, string> {
  return {
    ...paletteToCssVariables("primary", DEFAULT_PRIMARY_SCALE),
    ...paletteToCssVariables("neutral", DEFAULT_NEUTRAL_SCALE),
  };
}

function hasSchemeSidebarOverrides(
  appearance: TenantAppearanceLike,
  colorScheme: AppearanceColorScheme,
): boolean {
  const schemeColors = appearance.colorsByScheme?.[colorScheme];
  if (!schemeColors) {
    return false;
  }

  return TENANT_OVERRIDE_GROUPS.sidebar.some((cssVar) =>
    Boolean(schemeColors[cssVar]?.trim()),
  );
}

function applyEffects(
  appearance: TenantAppearanceLike,
  colorScheme: AppearanceColorScheme,
  vars: Record<string, string>,
): void {
  const shadowValue = appearance.effects?.shadowCard?.[colorScheme]?.trim();
  if (shadowValue) {
    vars["--shadow-card"] = shadowValue;
  }

  const gradientValue =
    appearance.effects?.gradientPrimary?.[colorScheme]?.trim();
  if (gradientValue) {
    vars["--gradient-primary"] = gradientValue;
  }
}

function resolveSpacingScale(
  appearance: TenantAppearanceLike,
): TenantAppearanceLike["spacingScale"] {
  const scale = appearance.spacingScale ?? {};
  const base = scale.base?.trim() || appearance.spacing?.trim();

  return {
    ...(scale.xs?.trim() ? { xs: scale.xs.trim() } : {}),
    ...(scale.sm?.trim() ? { sm: scale.sm.trim() } : {}),
    ...(scale.md?.trim() ? { md: scale.md.trim() } : {}),
    ...(base ? { base } : {}),
    ...(scale.lg?.trim() ? { lg: scale.lg.trim() } : {}),
  };
}

function applySpacingScale(
  appearance: TenantAppearanceLike,
  vars: Record<string, string>,
): void {
  const scale = resolveSpacingScale(appearance);

  if (scale?.xs) {
    vars["--spacing-tight"] = scale.xs;
  }
  if (scale?.sm) {
    vars["--spacing-compact"] = scale.sm;
  }
  if (scale?.md) {
    vars["--spacing-comfortable"] = scale.md;
  }
  if (scale?.base) {
    vars["--spacing-macro"] = scale.base;
  }
  if (scale?.lg) {
    vars["--spacing-section"] = scale.lg;
  }
}

function applyChartColors(
  appearance: TenantAppearanceLike,
  vars: Record<string, string>,
): void {
  const { chartColors } = appearance;
  if (!chartColors) {
    return;
  }

  if (chartColors.chart1?.trim()) {
    vars["--color-chart-1"] = chartColors.chart1.trim();
  }
  if (chartColors.chart2?.trim()) {
    vars["--color-chart-2"] = chartColors.chart2.trim();
  }
  if (chartColors.chart3?.trim()) {
    vars["--color-chart-3"] = chartColors.chart3.trim();
  }
  if (chartColors.chart4?.trim()) {
    vars["--color-chart-4"] = chartColors.chart4.trim();
  }
}

export function normalizeTenantAppearance<
  T extends TenantAppearanceLike | null | undefined,
>(appearance: T): T {
  if (!appearance) {
    return appearance;
  }

  const semanticsByScheme = {
    ...(appearance.semantics
      ? { light: { ...appearance.semantics } }
      : undefined),
    ...appearance.semanticsByScheme,
  };

  const colorsByScheme = {
    ...(appearance.colors ? { light: { ...appearance.colors } } : undefined),
    ...appearance.colorsByScheme,
  };

  return {
    ...appearance,
    ...(Object.keys(semanticsByScheme).length > 0 ? { semanticsByScheme } : {}),
    ...(Object.keys(colorsByScheme).length > 0 ? { colorsByScheme } : {}),
  };
}

export function appearanceToCssVariables(
  appearance: TenantAppearanceLike,
  options?: AppearanceToCssVariablesOptions,
): Record<string, string> {
  const colorScheme = options?.colorScheme ?? "light";
  const resolved = applyAppearancePreset(appearance);
  const vars = expandAppearancePalettes(resolved);

  if (options?.scopedPreview && !hasPaletteScaleVariables(vars)) {
    Object.assign(vars, defaultPaletteScaleVariables());
  }

  if (
    colorScheme === "dark" &&
    !hasSchemeSidebarOverrides(resolved, "dark") &&
    !resolved.colorsByScheme?.dark
  ) {
    stripSidebarVars(vars);
  }

  if (hasPaletteScaleVariables(vars)) {
    Object.assign(vars, resolveSemanticsFromPalette(vars, colorScheme));
  }

  Object.assign(vars, expandAppearanceSemantics(resolved, { colorScheme }));
  Object.assign(vars, expandSchemeColors(resolved, colorScheme));

  applyEffects(resolved, colorScheme, vars);
  applyChartColors(resolved, vars);

  if (resolved.fontFamily) {
    vars["--font-sans"] = resolved.fontFamily;
  }

  if (resolved.fontSizes?.body) {
    vars["--text-body"] = resolved.fontSizes.body;
  }
  if (resolved.fontSizes?.heading) {
    vars["--text-heading"] = resolved.fontSizes.heading;
  }
  if (resolved.radius) {
    vars["--radius-lg"] = resolved.radius;
  }
  if (resolved.radiusSm) {
    vars["--radius-sm"] = resolved.radiusSm;
  }

  applySpacingScale(resolved, vars);

  return vars;
}

export {
  APPEARANCE_PRESET_CATALOG,
  APPEARANCE_PRESETS,
  applyAppearancePreset,
  BOLD_APPEARANCE_PRESET,
  BUSINESS_APPEARANCE_PRESET,
  ELEGANT_APPEARANCE_PRESET,
  FRUTIGER_AERO_APPEARANCE_PRESET,
  NAMED_APPEARANCE_PRESETS,
  normalizeAppearancePreset,
  PROFESSIONAL_APPEARANCE_PRESET,
  SOFT_APPEARANCE_PRESET,
  SOPHISTICATED_APPEARANCE_PRESET,
  isAppearancePreset,
  type AppearancePreset,
  type NamedAppearancePreset,
} from "./presets/index.js";
export {
  BADGE_SEMANTIC_CSS_VARS,
  CHART_COLOR_CSS_VARS,
  DARK_MODE_REMAPPED_SEMANTIC_VARS,
  EFFECT_SEMANTIC_CSS_VARS,
  expandAppearanceSemantics,
  expandSchemeColors,
  filterSemanticsForColorScheme,
  isSemanticCssVar,
  LAYOUT_RADIUS_CSS_VARS,
  LAYOUT_SPACING_CSS_VARS,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
  SIDEBAR_CSS_VARS,
  stripSidebarVars,
  type BadgeSemanticCssVar,
  type ChartColorCssVar,
  type EffectSemanticCssVar,
  type LayoutRadiusCssVar,
  type LayoutSpacingCssVar,
  type SemanticOverridableCssVar,
} from "./semantics/resolve-semantics.js";
export {
  hasPaletteScaleVariables,
  resolveDarkSemanticsFromPalette,
  resolveLightSemanticsFromPalette,
  resolveSemanticsFromPalette,
} from "./semantics/resolve-from-palette.js";
export {
  COLOR_SCALE_STEPS,
  DEFAULT_NEUTRAL_SCALE,
  DEFAULT_PRIMARY_SCALE,
  expandAppearancePalettes,
  expandPaletteConfig,
  generateColorScale,
  getDefaultReferenceScale,
  inferPaletteFromLegacyColors,
  isColorScaleStep,
  isPaletteCssVar,
  normalizeHexColor,
  type ColorPaletteConfig,
  type ColorScaleStep,
  type PaletteKind,
};
