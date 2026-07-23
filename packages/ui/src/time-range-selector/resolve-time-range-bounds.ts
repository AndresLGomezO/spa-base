import {
  DURATION_MS,
  type TimeRangeBounds,
  type TimeRangeDurationId,
  type TimeRangeSelection,
} from "./time-range-types.js";

/**
 * Convert a wall-clock local time in `timeZone` to a UTC Date.
 * Uses iterative offset correction (stable across DST transitions).
 */
export function zonedLocalTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      fractionalSecondDigits: 3,
    }).formatToParts(new Date(utcMs));

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      get("fractionalSecond"),
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    utcMs += desired - asUtc;
  }

  return new Date(utcMs);
}

export function calendarDayBounds(
  now: Date,
  timeZone: string,
  dayOffset: number,
): TimeRangeBounds {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayParts = formatter.format(now); // YYYY-MM-DD
  const [y, m, d] = todayParts.split("-").map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d + dayOffset));
  const targetY = targetDate.getUTCFullYear();
  const targetM = targetDate.getUTCMonth() + 1;
  const targetD = targetDate.getUTCDate();

  const since = zonedLocalTimeToUtc(
    targetY,
    targetM,
    targetD,
    0,
    0,
    0,
    0,
    timeZone,
  );
  const until = zonedLocalTimeToUtc(
    targetY,
    targetM,
    targetD,
    23,
    59,
    59,
    999,
    timeZone,
  );

  return {
    sinceIso: since.toISOString(),
    untilIso: until.toISOString(),
  };
}

function relativeBounds(
  now: Date,
  duration: TimeRangeDurationId,
): TimeRangeBounds {
  const untilMs = now.getTime();
  return {
    sinceIso: new Date(untilMs - DURATION_MS[duration]).toISOString(),
    untilIso: new Date(untilMs).toISOString(),
  };
}

function aroundBounds(
  atIso: string,
  window: TimeRangeDurationId,
): TimeRangeBounds {
  const center = Date.parse(atIso);
  if (!Number.isFinite(center)) {
    throw new Error(`Invalid around timestamp: ${atIso}`);
  }
  const half = DURATION_MS[window];
  return {
    sinceIso: new Date(center - half).toISOString(),
    untilIso: new Date(center + half).toISOString(),
  };
}

export function resolveTimeRangeBounds(
  selection: TimeRangeSelection,
  now: Date,
  timeZone: string,
): TimeRangeBounds {
  switch (selection.mode) {
    case "custom": {
      const fromMs = Date.parse(selection.fromIso);
      const toMs = Date.parse(selection.toIso);
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
        throw new Error("Invalid custom time range");
      }
      if (fromMs > toMs) {
        return {
          sinceIso: new Date(toMs).toISOString(),
          untilIso: new Date(fromMs).toISOString(),
        };
      }
      return {
        sinceIso: new Date(fromMs).toISOString(),
        untilIso: new Date(toMs).toISOString(),
      };
    }
    case "around":
      return aroundBounds(selection.atIso, selection.window);
    case "preset":
      switch (selection.preset) {
        case "today":
          return calendarDayBounds(now, timeZone, 0);
        case "yesterday":
          return calendarDayBounds(now, timeZone, -1);
        default:
          return relativeBounds(now, selection.preset);
      }
  }
}
