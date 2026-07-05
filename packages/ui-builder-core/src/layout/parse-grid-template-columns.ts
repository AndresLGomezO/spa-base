export type GridTemplateColumnsErrorCode =
  | "empty"
  | "unbalanced_delimiters"
  | "invalid_repeat"
  | "invalid_track"
  | "track_count_mismatch";

export interface GridTemplateColumnsAnalysisSuccess {
  readonly ok: true;
  readonly tracks: readonly string[];
  readonly preview: string;
  readonly hasDynamicRepeat: boolean;
  readonly hasFlexibleTracks: boolean;
}

export interface GridTemplateColumnsAnalysisFailure {
  readonly ok: false;
  readonly errorCode: GridTemplateColumnsErrorCode;
  readonly tracks: readonly string[];
  readonly preview: string;
  readonly hasDynamicRepeat: boolean;
  readonly hasFlexibleTracks: boolean;
}

export type GridTemplateColumnsAnalysis =
  | GridTemplateColumnsAnalysisSuccess
  | GridTemplateColumnsAnalysisFailure;

export interface AnalyzeGridTemplateColumnsOptions {
  readonly expectedTrackCount?: number;
}

const LINE_NAME_PATTERN = /^\[[^\]]+\]$/;
const REPEAT_PATTERN =
  /^repeat\s*\(\s*(auto-fill|auto-fit|\d+)\s*,([\s\S]+)\)$/i;
const MINMAX_PATTERN = /^minmax\s*\(([\s\S]+)\)$/i;

class GridTemplateColumnsParseError extends Error {
  constructor(readonly code: GridTemplateColumnsErrorCode) {
    super(code);
  }
}

function hasBalancedDelimiters(value: string): boolean {
  let parenDepth = 0;
  let bracketDepth = 0;

  for (const char of value) {
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      if (parenDepth === 0) {
        return false;
      }
      parenDepth -= 1;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      continue;
    }
    if (char === "]") {
      if (bracketDepth === 0) {
        return false;
      }
      bracketDepth -= 1;
    }
  }

  return parenDepth === 0 && bracketDepth === 0;
}

function splitTopLevel(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;

  for (const char of input) {
    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      if (parenDepth === 0) {
        throw new GridTemplateColumnsParseError("unbalanced_delimiters");
      }
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      if (bracketDepth === 0) {
        throw new GridTemplateColumnsParseError("unbalanced_delimiters");
      }
      bracketDepth -= 1;
      current += char;
      continue;
    }

    if (/\s/.test(char) && parenDepth === 0 && bracketDepth === 0) {
      if (current.trim().length > 0) {
        segments.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (parenDepth !== 0 || bracketDepth !== 0) {
    throw new GridTemplateColumnsParseError("unbalanced_delimiters");
  }

  if (current.trim().length > 0) {
    segments.push(current.trim());
  }

  return segments;
}

function splitTopLevelCommas(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;

  for (const char of input) {
    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      if (parenDepth === 0) {
        throw new GridTemplateColumnsParseError("unbalanced_delimiters");
      }
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      if (bracketDepth === 0) {
        throw new GridTemplateColumnsParseError("unbalanced_delimiters");
      }
      bracketDepth -= 1;
      current += char;
      continue;
    }

    if (char === "," && parenDepth === 0 && bracketDepth === 0) {
      if (current.trim().length > 0) {
        segments.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (parenDepth !== 0 || bracketDepth !== 0) {
    throw new GridTemplateColumnsParseError("unbalanced_delimiters");
  }

  if (current.trim().length > 0) {
    segments.push(current.trim());
  }

  return segments;
}

function isFlexibleTrack(track: string): boolean {
  const trimmed = track.trim();
  if (/fr/i.test(trimmed)) {
    return true;
  }
  if (/^(auto|min-content|max-content)$/i.test(trimmed)) {
    return true;
  }
  if (/%/.test(trimmed)) {
    return true;
  }
  if (/^minmax\s*\(/i.test(trimmed)) {
    return true;
  }
  if (/^(fit-content|calc|clamp)\(/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isValidMinmaxTrack(track: string): boolean {
  const match = MINMAX_PATTERN.exec(track.trim());
  if (!match) {
    return true;
  }

  const parts = splitTopLevelCommas(match[1] ?? "");
  if (parts.length === 1) {
    return (parts[0]?.trim().length ?? 0) > 0;
  }

  return parts.length === 2 && parts.every((part) => part.trim().length > 0);
}

function normalizeTrackForCss(track: string): string {
  const trimmed = track.trim();
  const minmaxMatch = MINMAX_PATTERN.exec(trimmed);
  if (!minmaxMatch) {
    return trimmed;
  }

  const parts = splitTopLevelCommas(minmaxMatch[1] ?? "");
  if (parts.length === 2) {
    return trimmed;
  }

  const minValue = parts[0]?.trim();
  if (!minValue) {
    return trimmed;
  }

  if (/^-?\d+(\.\d+)?(px|rem|em|vw|vh|vmin|vmax|ch|ex)$/i.test(minValue)) {
    return minValue;
  }

  return `minmax(${minValue}, auto)`;
}

/** Normalizes shorthand tracks (e.g. minmax(200px)) into valid CSS grid-template-columns. */
export function normalizeGridTemplateColumnsForCss(value: string): string {
  try {
    const { tracks } = parseTracks(value);
    return tracks.map((track) => normalizeTrackForCss(track)).join(" ");
  } catch {
    return value.trim();
  }
}

function formatTrackForPreview(track: string): string | null {
  if (LINE_NAME_PATTERN.test(track)) {
    return null;
  }

  const minmaxMatch = MINMAX_PATTERN.exec(track.trim());
  if (minmaxMatch) {
    const parts = splitTopLevelCommas(minmaxMatch[1] ?? "");
    const minValue = parts[0]?.trim();
    const maxValue = parts[1]?.trim();

    if (minValue && !maxValue) {
      return minValue;
    }

    if (minValue === undefined || maxValue === undefined) {
      return track.trim();
    }
    if (minValue === maxValue) {
      return minValue;
    }
    return `${minValue}–${maxValue}`;
  }

  return track.trim();
}

function buildPreview(tracks: readonly string[]): string {
  const groups: Array<{ readonly formatted: string; count: number }> = [];

  for (const track of tracks) {
    const formatted = formatTrackForPreview(track);
    if (formatted === null) {
      continue;
    }

    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.formatted === formatted) {
      groups[groups.length - 1] = {
        formatted,
        count: lastGroup.count + 1,
      };
      continue;
    }

    groups.push({ formatted, count: 1 });
  }

  return groups
    .map((group) =>
      group.count === 1
        ? group.formatted
        : `${group.formatted} ×${group.count}`,
    )
    .join(" · ");
}

function resolveHasFlexibleTracks(tracks: readonly string[]): boolean {
  return tracks.some(
    (track) => !LINE_NAME_PATTERN.test(track) && isFlexibleTrack(track),
  );
}

function isValidGridTrackSize(track: string): boolean {
  const trimmed = track.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (LINE_NAME_PATTERN.test(trimmed)) {
    return true;
  }

  if (!hasBalancedDelimiters(trimmed)) {
    return false;
  }

  if (/^(auto|min-content|max-content)$/i.test(trimmed)) {
    return true;
  }

  if (/^-?\d+(\.\d+)?(px|rem|em|vw|vh|vmin|vmax|fr|%|ch|ex)$/i.test(trimmed)) {
    return true;
  }

  if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(trimmed)) {
    return true;
  }

  if (/^(minmax|fit-content|calc|clamp)\(.+\)$/i.test(trimmed)) {
    return isValidMinmaxTrack(trimmed);
  }

  return false;
}

function countTracks(tracks: readonly string[]): number {
  return tracks.filter((track) => !LINE_NAME_PATTERN.test(track)).length;
}

export function countDefinedGridTemplateTracks(
  tracks: readonly string[],
): number {
  return countTracks(tracks);
}

function expandSegment(segment: string): {
  readonly tracks: readonly string[];
  readonly hasDynamicRepeat: boolean;
} {
  const repeatMatch = segment.match(REPEAT_PATTERN);
  if (!repeatMatch) {
    if (!isValidGridTrackSize(segment)) {
      throw new GridTemplateColumnsParseError("invalid_track");
    }
    return { tracks: [segment], hasDynamicRepeat: false };
  }

  const countToken = repeatMatch[1];
  const trackListSource = repeatMatch[2]?.trim() ?? "";
  if (trackListSource.length === 0) {
    throw new GridTemplateColumnsParseError("invalid_repeat");
  }

  if (/^(auto-fill|auto-fit)$/i.test(countToken ?? "")) {
    const trackList = splitTopLevel(trackListSource).flatMap(
      (item) => expandSegment(item).tracks,
    );
    if (trackList.length === 0) {
      throw new GridTemplateColumnsParseError("invalid_repeat");
    }
    for (const track of trackList) {
      if (!isValidGridTrackSize(track)) {
        throw new GridTemplateColumnsParseError("invalid_track");
      }
    }
    return { tracks: [segment], hasDynamicRepeat: true };
  }

  const count = Number.parseInt(countToken ?? "", 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new GridTemplateColumnsParseError("invalid_repeat");
  }

  const trackList = splitTopLevel(trackListSource).flatMap(
    (item) => expandSegment(item).tracks,
  );
  if (trackList.length === 0) {
    throw new GridTemplateColumnsParseError("invalid_repeat");
  }

  const expanded: string[] = [];
  for (let index = 0; index < count; index += 1) {
    expanded.push(...trackList);
  }

  return { tracks: expanded, hasDynamicRepeat: false };
}

function parseTracks(value: string): {
  readonly tracks: readonly string[];
  readonly hasDynamicRepeat: boolean;
} {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new GridTemplateColumnsParseError("empty");
  }

  const segments = splitTopLevel(trimmed);
  if (segments.length === 0) {
    throw new GridTemplateColumnsParseError("empty");
  }

  let hasDynamicRepeat = false;
  const tracks: string[] = [];

  for (const segment of segments) {
    const expanded = expandSegment(segment);
    hasDynamicRepeat ||= expanded.hasDynamicRepeat;
    tracks.push(...expanded.tracks);
  }

  if (countTracks(tracks) === 0) {
    throw new GridTemplateColumnsParseError("invalid_track");
  }

  return { tracks, hasDynamicRepeat };
}

export function analyzeGridTemplateColumns(
  value: string,
  options: AnalyzeGridTemplateColumnsOptions = {},
): GridTemplateColumnsAnalysis {
  try {
    const { tracks, hasDynamicRepeat } = parseTracks(value);
    const preview = buildPreview(tracks);
    const hasFlexibleTracks = resolveHasFlexibleTracks(tracks);

    if (
      options.expectedTrackCount !== undefined &&
      !hasDynamicRepeat &&
      countTracks(tracks) !== options.expectedTrackCount
    ) {
      return {
        ok: false,
        errorCode: "track_count_mismatch",
        tracks,
        preview,
        hasDynamicRepeat,
        hasFlexibleTracks,
      };
    }

    return {
      ok: true,
      tracks,
      preview,
      hasDynamicRepeat,
      hasFlexibleTracks,
    };
  } catch (error) {
    if (error instanceof GridTemplateColumnsParseError) {
      return {
        ok: false,
        errorCode: error.code,
        tracks: [],
        preview: "",
        hasDynamicRepeat: false,
        hasFlexibleTracks: false,
      };
    }

    return {
      ok: false,
      errorCode: "invalid_track",
      tracks: [],
      preview: "",
      hasDynamicRepeat: false,
      hasFlexibleTracks: false,
    };
  }
}
