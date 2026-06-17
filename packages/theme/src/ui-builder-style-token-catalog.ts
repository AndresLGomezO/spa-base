import { COLOR_SCALE_STEPS } from "./palette/scale-steps.js";
import {
  BADGE_SEMANTIC_CSS_VARS,
  CHART_COLOR_CSS_VARS,
  EFFECT_SEMANTIC_CSS_VARS,
  LAYOUT_SPACING_CSS_VARS,
} from "./semantics/semantic-vars.js";
import { SIDEBAR_CSS_VARS } from "./semantics/resolve-semantics.js";

export interface UiBuilderStyleTokenOption {
  readonly label: string;
  readonly value: string;
}

const PALETTE_KINDS = [
  "primary",
  "neutral",
  "success",
  "warning",
  "danger",
] as const;

const LAYOUT_RADIUS_CSS_VARS = [
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
] as const;

const TYPOGRAPHY_CSS_VARS = [
  "--font-sans",
  "--text-body",
  "--text-heading",
] as const;

const WIDTH_CSS_VARS = ["--sidebar-width"] as const;

/** Additional semantic colors from semantics.css not in SEMANTIC_OVERRIDABLE_CSS_VARS. */
const EXTENDED_SEMANTIC_COLOR_CSS_VARS = [
  "--color-secondary",
  "--color-secondary-foreground",
  "--color-destructive",
  "--color-destructive-foreground",
  "--color-success",
  "--color-success-foreground",
  "--color-warning",
  "--color-warning-foreground",
  "--color-info",
  "--color-info-foreground",
  "--color-surface",
  "--color-surface-foreground",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-tertiary",
  "--color-text-inverse",
  "--color-text-disabled",
  "--color-focus",
  "--color-border-strong",
  "--color-divider",
  "--color-input-background",
  "--color-input-border",
  "--color-input-focus",
  "--color-button-background",
  "--color-button-foreground",
  "--color-avatar-border",
  "--color-skeleton",
  ...CHART_COLOR_CSS_VARS,
] as const;

const SEMANTIC_COLOR_CSS_VARS = [
  "--color-background",
  "--color-foreground",
  "--color-primary",
  "--color-primary-foreground",
  "--color-primary-hover",
  "--color-primary-active",
  "--color-muted",
  "--color-muted-foreground",
  "--color-border",
  "--color-border-muted",
  "--color-card",
  "--color-card-foreground",
  "--color-popover",
  "--color-popover-foreground",
  "--color-backdrop",
  "--color-hover",
  "--color-active",
  "--color-accent",
  "--color-accent-foreground",
  "--color-accent-hover",
  "--color-accent-active",
  ...EXTENDED_SEMANTIC_COLOR_CSS_VARS,
] as const;

const SIDEBAR_COLOR_CSS_VARS = SIDEBAR_CSS_VARS.filter((cssVar) =>
  cssVar.startsWith("--color-"),
);

export const SHADOW_TOKEN_OPTIONS: readonly UiBuilderStyleTokenOption[] = [
  { label: "None", value: "none" },
  { label: "Card", value: "card" },
] as const;

function cssVarOption(
  cssVar: string,
  label?: string,
): UiBuilderStyleTokenOption {
  const name = cssVar.replace(/^--/, "");
  const readable = label ?? humanizeCssVarName(name);
  return { label: readable, value: `var(${cssVar})` };
}

function humanizeCssVarName(name: string): string {
  return name
    .replace(/^color-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueOptions(
  options: readonly UiBuilderStyleTokenOption[],
): readonly UiBuilderStyleTokenOption[] {
  const seen = new Set<string>();
  const unique: UiBuilderStyleTokenOption[] = [];
  for (const option of options) {
    if (seen.has(option.value)) {
      continue;
    }
    seen.add(option.value);
    unique.push(option);
  }
  return unique;
}

export function buildSemanticColorOptions(): readonly UiBuilderStyleTokenOption[] {
  return uniqueOptions(
    SEMANTIC_COLOR_CSS_VARS.map((cssVar) => cssVarOption(cssVar)),
  );
}

export function buildSidebarColorOptions(): readonly UiBuilderStyleTokenOption[] {
  return SIDEBAR_COLOR_CSS_VARS.map((cssVar) => cssVarOption(cssVar));
}

export function buildBadgeColorOptions(): readonly UiBuilderStyleTokenOption[] {
  return BADGE_SEMANTIC_CSS_VARS.map((cssVar) => cssVarOption(cssVar));
}

export function buildPaletteColorOptions(): readonly UiBuilderStyleTokenOption[] {
  return PALETTE_KINDS.flatMap((kind) =>
    COLOR_SCALE_STEPS.map((step) =>
      cssVarOption(
        `--color-${kind}-${step}`,
        `${humanizeCssVarName(kind)} ${step}`,
      ),
    ),
  );
}

export function buildEffectColorOptions(): readonly UiBuilderStyleTokenOption[] {
  return EFFECT_SEMANTIC_CSS_VARS.map((cssVar) => {
    if (cssVar === "--shadow-card") {
      return cssVarOption(cssVar, "Shadow card");
    }
    if (cssVar === "--gradient-primary") {
      return cssVarOption(cssVar, "Gradient primary");
    }
    return cssVarOption(cssVar);
  });
}

export function buildEffectShadowVarOptions(): readonly UiBuilderStyleTokenOption[] {
  return EFFECT_SEMANTIC_CSS_VARS.filter((cssVar) =>
    cssVar.startsWith("--shadow-"),
  ).map((cssVar) => cssVarOption(cssVar, "Shadow card"));
}

export function buildRadiusTokenOptions(): readonly UiBuilderStyleTokenOption[] {
  return LAYOUT_RADIUS_CSS_VARS.map((cssVar) => cssVarOption(cssVar));
}

export function buildSpacingTokenOptions(): readonly UiBuilderStyleTokenOption[] {
  return LAYOUT_SPACING_CSS_VARS.map((cssVar) => cssVarOption(cssVar));
}

export function buildTypographySizeOptions(): readonly UiBuilderStyleTokenOption[] {
  return TYPOGRAPHY_CSS_VARS.filter((cssVar) =>
    cssVar.startsWith("--text-"),
  ).map((cssVar) => cssVarOption(cssVar));
}

export function buildTypographyFontFamilyOptions(): readonly UiBuilderStyleTokenOption[] {
  return TYPOGRAPHY_CSS_VARS.filter((cssVar) =>
    cssVar.startsWith("--font-"),
  ).map((cssVar) => cssVarOption(cssVar, "Sans"));
}

export function buildWidthTokenOptions(): readonly UiBuilderStyleTokenOption[] {
  return WIDTH_CSS_VARS.map((cssVar) => cssVarOption(cssVar, "Sidebar width"));
}

/** Full semantic + sidebar + badge color catalog for UI builder color pickers. */
export function buildUiBuilderColorCatalog(): readonly UiBuilderStyleTokenOption[] {
  return uniqueOptions([
    ...buildSemanticColorOptions(),
    ...buildSidebarColorOptions(),
    ...buildBadgeColorOptions(),
  ]);
}

export const SEMANTIC_COLOR_OPTIONS = buildSemanticColorOptions();
export const PALETTE_COLOR_OPTIONS = buildPaletteColorOptions();
export const EFFECT_COLOR_OPTIONS = buildEffectColorOptions();
