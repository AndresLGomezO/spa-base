/** Relative duration tokens used by presets and around-window. */
export type TimeRangeDurationId =
  | "15s"
  | "30s"
  | "1m"
  | "5m"
  | "10m"
  | "1h"
  | "1d";

export type TimeRangePresetId = TimeRangeDurationId | "today" | "yesterday";

export type TimeRangeMode = "preset" | "custom" | "around";

export interface TimeRangePresetSelection {
  readonly mode: "preset";
  readonly preset: TimeRangePresetId;
}

export interface TimeRangeCustomSelection {
  readonly mode: "custom";
  readonly fromIso: string;
  readonly toIso: string;
}

export interface TimeRangeAroundSelection {
  readonly mode: "around";
  readonly atIso: string;
  readonly window: TimeRangeDurationId;
}

export type TimeRangeSelection =
  | TimeRangePresetSelection
  | TimeRangeCustomSelection
  | TimeRangeAroundSelection;

export interface TimeRangeBounds {
  readonly sinceIso: string;
  readonly untilIso: string;
}

export const TIME_RANGE_DURATION_IDS: readonly TimeRangeDurationId[] = [
  "15s",
  "30s",
  "1m",
  "5m",
  "10m",
  "1h",
  "1d",
] as const;

export const TIME_RANGE_PRESET_IDS: readonly TimeRangePresetId[] = [
  "15s",
  "30s",
  "1m",
  "5m",
  "10m",
  "1h",
  "1d",
  "today",
  "yesterday",
] as const;

export const DEFAULT_TIME_RANGE_SELECTION: TimeRangePresetSelection = {
  mode: "preset",
  preset: "5m",
};

export const DURATION_MS: Record<TimeRangeDurationId, number> = {
  "15s": 15_000,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 5 * 60_000,
  "10m": 10 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export function isTimeRangeDurationId(
  value: string,
): value is TimeRangeDurationId {
  return (TIME_RANGE_DURATION_IDS as readonly string[]).includes(value);
}

export function isTimeRangePresetId(value: string): value is TimeRangePresetId {
  return (TIME_RANGE_PRESET_IDS as readonly string[]).includes(value);
}
