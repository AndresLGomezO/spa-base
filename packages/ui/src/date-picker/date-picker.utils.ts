import { formatDateDisplayValue } from "../data-display/format-display-value.js";
import { isIsoDatetimeString } from "../data-display/is-iso-datetime-string.js";
import type {
  CalendarDateParts,
  DatePickerMode,
  TimeParts,
} from "./date-picker.types.js";

const TIME_ONLY_REFERENCE_DATE = { year: 1970, month: 0, day: 1 };

export function parseIsoToUtcParts(
  value: string | null | undefined,
): (CalendarDateParts & TimeParts) | null {
  if (!value?.trim() || !isIsoDatetimeString(value)) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function buildIsoFromParts(parts: CalendarDateParts & TimeParts): string {
  return new Date(
    Date.UTC(
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
      0,
      0,
    ),
  ).toISOString();
}

export function buildIsoForMode(
  mode: DatePickerMode,
  parts: CalendarDateParts & TimeParts,
): string {
  if (mode === "date") {
    return buildIsoFromParts({
      ...parts,
      hour: 0,
      minute: 0,
      day: parts.day,
    });
  }
  if (mode === "time") {
    return buildIsoFromParts({
      ...TIME_ONLY_REFERENCE_DATE,
      hour: parts.hour,
      minute: parts.minute,
    });
  }
  return buildIsoFromParts(parts);
}

function getDefaultParts(mode: DatePickerMode): CalendarDateParts & TimeParts {
  const now = new Date();
  const base = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
  };
  if (mode === "time") {
    return {
      ...TIME_ONLY_REFERENCE_DATE,
      hour: base.hour,
      minute: base.minute,
    };
  }
  return base;
}

export function resolvePickerParts(
  mode: DatePickerMode,
  value: string | null | undefined,
): CalendarDateParts & TimeParts {
  const parsed = parseIsoToUtcParts(value);
  if (parsed) {
    if (mode === "time") {
      return {
        ...TIME_ONLY_REFERENCE_DATE,
        hour: parsed.hour,
        minute: parsed.minute,
      };
    }
    return parsed;
  }
  return getDefaultParts(mode);
}

export function formatPickerDisplayValue(
  mode: DatePickerMode,
  value: string | null | undefined,
  locale = "en",
  timeZone = "UTC",
): string {
  if (!value?.trim() || !isIsoDatetimeString(value)) {
    return "";
  }
  return formatDateDisplayValue(value, {
    locale,
    timeZone,
    dateDisplayFormat: mode,
  });
}

export function getYearPageStart(selectedYear: number): number {
  return Math.floor(selectedYear / 12) * 12;
}

export function getYearPageYears(startYear: number): readonly number[] {
  return Array.from({ length: 12 }, (_, index) => startYear + index);
}

export function getWeekdayLabels(locale: string): readonly string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const base = Date.UTC(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(base + index * 86_400_000)),
  );
}

export function getMonthLabels(locale: string): readonly string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short" });
  return Array.from({ length: 12 }, (_, month) =>
    formatter.format(new Date(Date.UTC(2024, month, 1))),
  );
}

interface CalendarDayCell {
  readonly day: number;
  readonly month: number;
  readonly year: number;
  readonly inCurrentMonth: boolean;
}

export function getCalendarDayCells(
  year: number,
  month: number,
): readonly CalendarDayCell[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startOffset = firstDay.getUTCDay();
  const gridStart = new Date(Date.UTC(year, month, 1 - startOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * 86_400_000);
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === month,
    };
  });
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): CalendarDateParts {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: 1,
  };
}

export function to12Hour(hour24: number): { hour12: number; isPm: boolean } {
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, isPm };
}

export function from12Hour(hour12: number, isPm: boolean): number {
  if (hour12 === 12) {
    return isPm ? 12 : 0;
  }
  return isPm ? hour12 + 12 : hour12;
}

export function formatMonthYearLabel(
  year: number,
  month: number,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function formatTimePreview(
  hour: number,
  minute: number,
  locale = "en",
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(1970, 0, 1, hour, minute)));
}
