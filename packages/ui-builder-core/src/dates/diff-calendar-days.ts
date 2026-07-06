function calendarDayUtcMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(
    parts.find((part) => part.type === "month")?.value ?? "0",
  );
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  return Date.UTC(year, month - 1, day);
}

export function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function diffCalendarDays(
  target: Date,
  reference: Date,
  timeZone: string,
): number {
  const dayMs = 86_400_000;
  return Math.round(
    (calendarDayUtcMs(target, timeZone) -
      calendarDayUtcMs(reference, timeZone)) /
      dayMs,
  );
}
