import {
  DEFAULT_TIME_RANGE_SELECTION,
  isTimeRangeDurationId,
  isTimeRangePresetId,
  type TimeRangeSelection,
} from "@repo/ui";

const DEBUGGER_TIME_PARAM = "time";
const DEBUGGER_TIME_FROM_PARAM = "from";
const DEBUGGER_TIME_TO_PARAM = "to";
const DEBUGGER_TIME_AT_PARAM = "at";
const DEBUGGER_TIME_WINDOW_PARAM = "window";
const DEBUGGER_TIME_TZ_PARAM = "tz";

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function parseDebuggerTimeSelection(
  params: URLSearchParams,
): TimeRangeSelection {
  const raw = params.get(DEBUGGER_TIME_PARAM);

  if (!raw || raw === "5m") {
    // Absent or explicit default both normalize to default selection.
    // Explicit `time=5m` is still valid; callers omit it when writing default.
    if (!raw) {
      return DEFAULT_TIME_RANGE_SELECTION;
    }
    return { mode: "preset", preset: "5m" };
  }

  if (raw === "custom") {
    const fromIso = params.get(DEBUGGER_TIME_FROM_PARAM);
    const toIso = params.get(DEBUGGER_TIME_TO_PARAM);
    if (
      fromIso &&
      toIso &&
      Number.isFinite(Date.parse(fromIso)) &&
      Number.isFinite(Date.parse(toIso))
    ) {
      return { mode: "custom", fromIso, toIso };
    }
    return DEFAULT_TIME_RANGE_SELECTION;
  }

  if (raw === "around") {
    const atIso = params.get(DEBUGGER_TIME_AT_PARAM);
    const window = params.get(DEBUGGER_TIME_WINDOW_PARAM);
    if (
      atIso &&
      Number.isFinite(Date.parse(atIso)) &&
      window &&
      isTimeRangeDurationId(window)
    ) {
      return { mode: "around", atIso, window };
    }
    return DEFAULT_TIME_RANGE_SELECTION;
  }

  if (isTimeRangePresetId(raw)) {
    return { mode: "preset", preset: raw };
  }

  return DEFAULT_TIME_RANGE_SELECTION;
}

export function parseDebuggerTimeZone(
  params: URLSearchParams,
  browserTimeZone: string = getBrowserTimeZone(),
): string {
  const raw = params.get(DEBUGGER_TIME_TZ_PARAM)?.trim();
  return raw && raw.length > 0 ? raw : browserTimeZone;
}

export function writeDebuggerTimeSelection(
  params: URLSearchParams,
  selection: TimeRangeSelection,
): void {
  params.delete(DEBUGGER_TIME_PARAM);
  params.delete(DEBUGGER_TIME_FROM_PARAM);
  params.delete(DEBUGGER_TIME_TO_PARAM);
  params.delete(DEBUGGER_TIME_AT_PARAM);
  params.delete(DEBUGGER_TIME_WINDOW_PARAM);

  if (selection.mode === "preset") {
    if (selection.preset === DEFAULT_TIME_RANGE_SELECTION.preset) {
      return;
    }
    params.set(DEBUGGER_TIME_PARAM, selection.preset);
    return;
  }

  if (selection.mode === "custom") {
    params.set(DEBUGGER_TIME_PARAM, "custom");
    params.set(DEBUGGER_TIME_FROM_PARAM, selection.fromIso);
    params.set(DEBUGGER_TIME_TO_PARAM, selection.toIso);
    return;
  }

  params.set(DEBUGGER_TIME_PARAM, "around");
  params.set(DEBUGGER_TIME_AT_PARAM, selection.atIso);
  params.set(DEBUGGER_TIME_WINDOW_PARAM, selection.window);
}

export function writeDebuggerTimeZone(
  params: URLSearchParams,
  timeZone: string,
  browserTimeZone: string = getBrowserTimeZone(),
): void {
  if (!timeZone || timeZone === browserTimeZone) {
    params.delete(DEBUGGER_TIME_TZ_PARAM);
  } else {
    params.set(DEBUGGER_TIME_TZ_PARAM, timeZone);
  }
}

export function debuggerTimeSelectionKey(
  selection: TimeRangeSelection,
): string {
  switch (selection.mode) {
    case "preset":
      return `preset:${selection.preset}`;
    case "custom":
      return `custom:${selection.fromIso}:${selection.toIso}`;
    case "around":
      return `around:${selection.atIso}:${selection.window}`;
  }
}
