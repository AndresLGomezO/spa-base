import type { EntityQueryTemporalPreset } from "./types.js";

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function endOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

/** ISO week starts on Monday (UTC). */
function startOfUtcWeek(date: Date): Date {
  const utcDay = date.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = startOfUtcDay(date);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

function endOfUtcWeek(date: Date): Date {
  const monday = startOfUtcWeek(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return endOfUtcDay(sunday);
}

/**
 * Resolves temporal presets to ISO timestamps in UTC.
 * Tenant timezone support is a future enhancement.
 */
export function resolveTemporalPreset(
  preset: EntityQueryTemporalPreset,
  now: Date = new Date(),
): string {
  switch (preset) {
    case "today":
    case "startOfDay":
      return startOfUtcDay(now).toISOString();
    case "endOfDay":
      return endOfUtcDay(now).toISOString();
    case "startOfWeek":
      return startOfUtcWeek(now).toISOString();
    case "endOfWeek":
      return endOfUtcWeek(now).toISOString();
    case "startOfMonth":
      return startOfUtcMonth(now).toISOString();
    case "endOfMonth":
      return endOfUtcMonth(now).toISOString();
    case "startOfYear":
      return startOfUtcYear(now).toISOString();
    case "endOfYear":
      return endOfUtcYear(now).toISOString();
    default:
      return startOfUtcDay(now).toISOString();
  }
}
