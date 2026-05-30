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
