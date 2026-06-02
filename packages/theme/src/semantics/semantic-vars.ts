/** Status badge colors for card layout and similar UI. */
export const BADGE_SEMANTIC_CSS_VARS = [
  "--color-badge-default",
  "--color-badge-default-foreground",
  "--color-badge-success",
  "--color-badge-success-foreground",
  "--color-badge-warning",
  "--color-badge-warning-foreground",
  "--color-badge-danger",
  "--color-badge-danger-foreground",
  "--color-badge-info",
  "--color-badge-info-foreground",
] as const;

export type BadgeSemanticCssVar = (typeof BADGE_SEMANTIC_CSS_VARS)[number];

/** Semantic tokens tenants may override (advanced appearance editor). */
export const SEMANTIC_OVERRIDABLE_CSS_VARS = [
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
  ...BADGE_SEMANTIC_CSS_VARS,
] as const;

export type SemanticOverridableCssVar =
  (typeof SEMANTIC_OVERRIDABLE_CSS_VARS)[number];

export function isSemanticCssVar(key: string): boolean {
  const normalized = key.startsWith("--") ? key : `--${key}`;
  return (SEMANTIC_OVERRIDABLE_CSS_VARS as readonly string[]).includes(
    normalized,
  );
}

export function normalizeSemanticCssVarKey(key: string): string {
  return key.startsWith("--") ? key : `--${key}`;
}
