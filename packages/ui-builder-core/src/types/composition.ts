/**
 * Composition scopes for the unified UI builder.
 * @see docs/guides/advanced-ui-builder.md
 */
export type CompositionScope = "component" | "block" | "section" | "screen";

export const COMPOSITION_SCOPES: readonly CompositionScope[] = [
  "component",
  "block",
  "section",
  "screen",
] as const;

export type RootNodeKind = "container" | "screen-root";

/** Maps a composition scope to its canonical root node kind. */
export function resolveRootNodeKind(scope: CompositionScope): RootNodeKind {
  return scope === "screen" ? "screen-root" : "container";
}
