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
  type ColorPaletteConfig,
} from "./palette/generate-scale.js";

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
  "--color-sidebar",
  "--color-sidebar-foreground",
  "--color-sidebar-border",
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
  sidebar: [
    "--color-sidebar",
    "--color-sidebar-foreground",
    "--color-sidebar-border",
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
  readonly colors?: Readonly<Record<string, string>>;
  readonly palettes?: {
    readonly primary?: ColorPaletteConfig;
    readonly neutral?: ColorPaletteConfig;
  };
  readonly fontFamily?: string;
  readonly fontSizes?: {
    readonly body?: string;
    readonly heading?: string;
  };
  readonly radius?: string;
  readonly spacing?: string;
}

export function appearanceToCssVariables(
  appearance: TenantAppearanceLike,
): Record<string, string> {
  const vars = expandAppearancePalettes(appearance);

  if (appearance.fontFamily) {
    vars["--font-sans"] = appearance.fontFamily;
  }

  if (appearance.fontSizes?.body) {
    vars["--text-body"] = appearance.fontSizes.body;
  }
  if (appearance.fontSizes?.heading) {
    vars["--text-heading"] = appearance.fontSizes.heading;
  }
  if (appearance.radius) {
    vars["--radius-md"] = appearance.radius;
  }
  if (appearance.spacing) {
    vars["--spacing"] = appearance.spacing;
  }

  return vars;
}

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
