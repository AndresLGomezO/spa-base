import { isPaletteCssVar } from "../palette/generate-scale.js";
import type { TenantAppearanceLike } from "../tenant-overrides.js";
import {
  DARK_MODE_REMAPPED_SEMANTIC_VARS,
  filterSemanticsForColorScheme,
  type AppearanceColorScheme,
} from "./dark-mode-remaps.js";
import {
  isSemanticCssVar,
  normalizeSemanticCssVarKey,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
} from "./semantic-vars.js";

export {
  DARK_MODE_REMAPPED_SEMANTIC_VARS,
  filterSemanticsForColorScheme,
  type AppearanceColorScheme,
} from "./dark-mode-remaps.js";

export {
  BADGE_SEMANTIC_CSS_VARS,
  CHART_COLOR_CSS_VARS,
  EFFECT_SEMANTIC_CSS_VARS,
  isSemanticCssVar,
  LAYOUT_RADIUS_CSS_VARS,
  LAYOUT_SPACING_CSS_VARS,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
  type BadgeSemanticCssVar,
  type ChartColorCssVar,
  type EffectSemanticCssVar,
  type LayoutRadiusCssVar,
  type LayoutSpacingCssVar,
  type SemanticOverridableCssVar,
} from "./semantic-vars.js";

interface ExpandAppearanceSemanticsOptions {
  readonly colorScheme?: AppearanceColorScheme;
}

function normalizeCssVarKey(key: string): string {
  return key.startsWith("--") ? key : `--${key}`;
}

function mergeSemanticRecord(
  target: Record<string, string>,
  source: Readonly<Record<string, string>> | undefined,
): void {
  if (!source) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value.trim()) {
      target[normalizeSemanticCssVarKey(key)] = value.trim();
    }
  }
}

export function expandAppearanceSemantics(
  appearance: TenantAppearanceLike,
  options?: ExpandAppearanceSemanticsOptions,
): Record<string, string> {
  const colorScheme = options?.colorScheme ?? "light";
  const vars: Record<string, string> = {};
  const hasExplicitDarkOverrides = Boolean(
    appearance.semanticsByScheme?.dark &&
    Object.keys(appearance.semanticsByScheme.dark).length > 0,
  );

  mergeSemanticRecord(vars, appearance.semanticsByScheme?.[colorScheme]);

  if (appearance.semantics) {
    const darkRemaps = new Set<string>(DARK_MODE_REMAPPED_SEMANTIC_VARS);
    for (const [key, value] of Object.entries(appearance.semantics)) {
      if (!value.trim()) {
        continue;
      }
      const cssVar = normalizeSemanticCssVarKey(key);
      if (vars[cssVar]) {
        continue;
      }
      if (colorScheme === "light" || !darkRemaps.has(cssVar)) {
        vars[cssVar] = value.trim();
      }
    }
  }

  if (colorScheme === "light" && appearance.colors) {
    for (const [key, value] of Object.entries(appearance.colors)) {
      if (!value.trim() || isPaletteCssVar(key)) {
        continue;
      }
      const cssVar = normalizeSemanticCssVarKey(key);
      if (isSemanticCssVar(cssVar) && !vars[cssVar]) {
        vars[cssVar] = value.trim();
      }
    }
  }

  if (colorScheme === "dark" && !hasExplicitDarkOverrides) {
    return filterSemanticsForColorScheme(vars, "dark");
  }

  return vars;
}

export function expandSchemeColors(
  appearance: TenantAppearanceLike,
  colorScheme: AppearanceColorScheme,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const schemeColors = appearance.colorsByScheme?.[colorScheme];

  if (schemeColors) {
    for (const [key, value] of Object.entries(schemeColors)) {
      if (value.trim() && !isPaletteCssVar(key)) {
        vars[normalizeCssVarKey(key)] = value.trim();
      }
    }
    return vars;
  }

  if (colorScheme === "light" && appearance.colors) {
    for (const [key, value] of Object.entries(appearance.colors)) {
      if (value.trim() && !isPaletteCssVar(key)) {
        vars[normalizeCssVarKey(key)] = value.trim();
      }
    }
  }

  return vars;
}

export const SIDEBAR_CSS_VARS = [
  "--color-sidebar",
  "--color-sidebar-foreground",
  "--color-sidebar-border",
  "--color-sidebar-highlight",
  "--color-sidebar-hover",
  "--color-sidebar-accent",
  "--color-sidebar-accent-foreground",
  "--sidebar-width",
] as const;

export function stripSidebarVars(vars: Record<string, string>): void {
  for (const cssVar of SIDEBAR_CSS_VARS) {
    delete vars[cssVar];
  }
}
