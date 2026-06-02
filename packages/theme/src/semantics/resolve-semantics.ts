import { isPaletteCssVar } from "../palette/generate-scale.js";
import type { TenantAppearanceLike } from "../tenant-overrides.js";
import {
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
  isSemanticCssVar,
  SEMANTIC_OVERRIDABLE_CSS_VARS,
  type BadgeSemanticCssVar,
  type SemanticOverridableCssVar,
} from "./semantic-vars.js";

interface ExpandAppearanceSemanticsOptions {
  readonly colorScheme?: AppearanceColorScheme;
}

export function expandAppearanceSemantics(
  appearance: TenantAppearanceLike,
  options?: ExpandAppearanceSemanticsOptions,
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (appearance.semantics) {
    for (const [key, value] of Object.entries(appearance.semantics)) {
      if (value.trim()) {
        vars[normalizeSemanticCssVarKey(key)] = value.trim();
      }
    }
  }

  if (appearance.colors) {
    for (const [key, value] of Object.entries(appearance.colors)) {
      if (!value.trim() || isPaletteCssVar(key)) {
        continue;
      }
      const cssVar = normalizeSemanticCssVarKey(key);
      if (isSemanticCssVar(cssVar)) {
        vars[cssVar] = value.trim();
      }
    }
  }

  return filterSemanticsForColorScheme(vars, options?.colorScheme ?? "light");
}
