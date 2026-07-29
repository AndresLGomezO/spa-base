/**
 * Pure helpers for cascading dotted-key filters in the Translations UI.
 */

export function splitKeySegments(key: string): string[] {
  return key.split(".").filter((segment) => segment.length > 0);
}

export function keyWithoutRootPrefix(key: string): string {
  const dot = key.indexOf(".");
  return dot === -1 ? key : key.slice(dot + 1);
}

function matchesAncestors(
  segments: readonly string[],
  pathSelections: readonly (readonly string[])[],
  upToDepthExclusive: number,
): boolean {
  for (let depth = 0; depth < upToDepthExclusive; depth += 1) {
    const selected = pathSelections[depth];
    if (!selected || selected.length === 0) continue;
    const segment = segments[depth];
    if (segment == null || !selected.includes(segment)) {
      return false;
    }
  }
  return true;
}

/**
 * Unique segments at `depth` among keys matching all earlier non-empty selections.
 */
export function collectSegmentOptions(
  keys: readonly string[],
  pathSelections: readonly (readonly string[])[],
  depth: number,
): string[] {
  const options = new Set<string>();
  for (const key of keys) {
    const segments = splitKeySegments(key);
    if (segments.length <= depth) continue;
    if (!matchesAncestors(segments, pathSelections, depth)) continue;
    const segment = segments[depth];
    if (segment) options.add(segment);
  }
  return [...options].sort((a, b) => a.localeCompare(b));
}

export function keyMatchesSegmentPath(
  key: string,
  pathSelections: readonly (readonly string[])[],
): boolean {
  if (pathSelections.every((selection) => selection.length === 0)) {
    return true;
  }
  const segments = splitKeySegments(key);
  for (let depth = 0; depth < pathSelections.length; depth += 1) {
    const selected = pathSelections[depth];
    if (!selected || selected.length === 0) continue;
    const segment = segments[depth];
    if (segment == null || !selected.includes(segment)) {
      return false;
    }
  }
  return true;
}

/**
 * After parent edits: truncate to active depths and drop invalid deeper values.
 * Empty trailing levels are removed.
 */
export function pruneSegmentPath(
  keys: readonly string[],
  pathSelections: readonly (readonly string[])[],
): string[][] {
  if (pathSelections.length === 0) return [];

  const next: string[][] = [];
  for (let depth = 0; depth < pathSelections.length; depth += 1) {
    const selected = pathSelections[depth] ?? [];
    if (selected.length === 0) {
      // Stop cascading once a level is cleared.
      break;
    }
    const valid = new Set(collectSegmentOptions(keys, next, depth));
    const pruned = selected
      .filter((value) => valid.has(value))
      .sort((a, b) => a.localeCompare(b));
    if (pruned.length === 0) {
      break;
    }
    next.push(pruned);
  }
  return next;
}

/**
 * Apply a change at `depth`: keep ancestors, set this level, prune deeper levels.
 */
export function setSegmentPathAtDepth(
  keys: readonly string[],
  pathSelections: readonly (readonly string[])[],
  depth: number,
  selected: readonly string[],
): string[][] {
  const ancestors = pathSelections.slice(0, depth).map((level) => [...level]);
  const nextBase =
    selected.length === 0
      ? ancestors
      : [...ancestors, [...selected].sort((a, b) => a.localeCompare(b))];
  return pruneSegmentPath(keys, nextBase);
}

/**
 * Depths that should show a filter dropdown.
 * Depth 0 always; depth d+1 only when depth d has a selection.
 */
export function visibleSegmentFilterDepths(
  pathSelections: readonly (readonly string[])[],
): number[] {
  const depths = [0];
  for (let depth = 0; depth < pathSelections.length; depth += 1) {
    if ((pathSelections[depth]?.length ?? 0) === 0) break;
    depths.push(depth + 1);
  }
  return depths;
}
