/**
 * Semantic tokens remapped under `.dark` in dark.css.
 * Do not set these as inline styles on :root in dark mode — stylesheet remaps
 * must win so palette scales drive surfaces and text in both color schemes.
 */
export const DARK_MODE_REMAPPED_SEMANTIC_VARS = [
  "--color-background",
  "--color-foreground",
  "--color-surface",
  "--color-surface-foreground",
  "--color-card",
  "--color-card-foreground",
  "--color-card-border",
  "--color-popover",
  "--color-popover-foreground",
  "--color-popover-border",
  "--color-muted",
  "--color-muted-foreground",
  "--color-secondary",
  "--color-secondary-foreground",
  "--color-accent",
  "--color-accent-foreground",
  "--color-accent-hover",
  "--color-accent-active",
  "--color-border",
  "--color-border-muted",
  "--color-border-strong",
  "--color-divider",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-tertiary",
  "--color-text-inverse",
  "--color-text-disabled",
  "--color-hover",
  "--color-active",
  "--color-primary-hover",
  "--color-primary-active",
  "--color-backdrop",
  "--color-input-background",
  "--color-input-border",
  "--color-skeleton",
  "--color-badge-default",
  "--color-badge-default-foreground",
  "--color-badge-background",
  "--color-badge-foreground",
  "--color-badge-success",
  "--color-badge-success-foreground",
  "--color-badge-warning",
  "--color-badge-warning-foreground",
  "--color-badge-danger",
  "--color-badge-danger-foreground",
  "--color-badge-info",
  "--color-badge-info-foreground",
] as const;

export type AppearanceColorScheme = "light" | "dark";

export function filterSemanticsForColorScheme(
  semantics: Record<string, string>,
  colorScheme: AppearanceColorScheme = "light",
): Record<string, string> {
  if (colorScheme === "light") {
    return semantics;
  }

  const darkRemaps = new Set<string>(DARK_MODE_REMAPPED_SEMANTIC_VARS);
  return Object.fromEntries(
    Object.entries(semantics).filter(([key]) => !darkRemaps.has(key)),
  );
}
