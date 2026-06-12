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
  type AppearanceColorScheme,
} from "./semantics/resolve-semantics.js";
import {
  hasPaletteScaleVariables,
  resolveSemanticsFromPalette,
} from "./semantics/resolve-from-palette.js";
import {
  BADGE_SEMANTIC_CSS_VARS,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
} from "./semantics/semantic-vars.js";

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
  "--spacing",
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
  typography: [
    "--font-sans",
    "--text-body",
    "--text-body--line-height",
    "--text-heading",
    "--text-heading--line-height",
  ],
  layout: ["--radius-md", "--spacing"],
} as const satisfies Record<string, readonly TenantOverridableCssVar[]>;

export interface TenantAppearanceLike {
  readonly preset?: AppearancePreset;
  readonly colors?: Readonly<Record<string, string>>;
  readonly palettes?: {
    readonly primary?: ColorPaletteConfig;
    readonly neutral?: ColorPaletteConfig;
  };
  readonly semantics?: Readonly<Record<string, string>>;
  readonly fontFamily?: string;
  readonly fontSizes?: {
    readonly body?: string;
    readonly heading?: string;
  };
  readonly radius?: string;
  readonly spacing?: string;
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

  if (hasPaletteScaleVariables(vars)) {
    Object.assign(vars, resolveSemanticsFromPalette(vars, colorScheme));
  }

  Object.assign(vars, expandAppearanceSemantics(resolved, { colorScheme }));

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
    vars["--radius-md"] = resolved.radius;
  }
  if (resolved.spacing) {
    vars["--spacing"] = resolved.spacing;
  }

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
  DARK_MODE_REMAPPED_SEMANTIC_VARS,
  expandAppearanceSemantics,
  filterSemanticsForColorScheme,
  isSemanticCssVar,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
  type AppearanceColorScheme,
  type BadgeSemanticCssVar,
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
