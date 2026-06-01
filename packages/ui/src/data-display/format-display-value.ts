import { isIsoDatetimeString } from "./is-iso-datetime-string.js";

export type DisplayFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "relation"
  | "enum";

export type DisplayFormat = "currency" | "plain" | "percentage";

export type DateDisplayFormat = "date" | "datetime" | "time";

export interface FormatDisplayOptions {
  readonly locale?: string;
  readonly timeZone?: string;
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly fieldName?: string;
}

function parseIsoDatetimeValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || !isIsoDatetimeString(value)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimezoneShort(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const tz = parts.find((part) => part.type === "timeZoneName")?.value;
  return tz ?? timeZone;
}

export function formatDateDisplayValue(
  value: string | Date,
  options: Pick<
    FormatDisplayOptions,
    "locale" | "timeZone" | "dateDisplayFormat"
  > = {},
): string {
  const locale = options.locale ?? "en";
  const timeZone = options.timeZone ?? "UTC";
  const dateDisplayFormat = options.dateDisplayFormat ?? "datetime";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  if (dateDisplayFormat === "date") {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  if (dateDisplayFormat === "time") {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";

  const tz = formatTimezoneShort(date, locale, timeZone);
  return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod} ${tz}`;
}

function hasFractionalPart(value: number): boolean {
  return !Number.isInteger(value);
}

export function formatNumberDisplayValue(
  value: number,
  options: Pick<FormatDisplayOptions, "locale"> = {},
): string {
  const locale = options.locale ?? "en";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasFractionalPart(value) ? 2 : 0,
    maximumFractionDigits: hasFractionalPart(value) ? 2 : 0,
  }).format(value);
}

export function isCurrencyField(
  _fieldType: DisplayFieldType | undefined,
  _fieldName: string | undefined,
  displayFormat: DisplayFormat | undefined,
): boolean {
  return displayFormat === "currency";
}

export function formatDisplayValue(
  value: unknown,
  options: FormatDisplayOptions = {},
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const fieldType = options.fieldType;
  const locale = options.locale ?? "en";
  const timeZone = options.timeZone ?? "UTC";

  if (fieldType === "boolean" || typeof value === "boolean") {
    return typeof value === "boolean" ? String(value) : "—";
  }

  if (fieldType === "date") {
    const parsed = parseIsoDatetimeValue(value);
    if (parsed) {
      return formatDateDisplayValue(parsed, {
        locale,
        timeZone,
        dateDisplayFormat: options.dateDisplayFormat,
      });
    }
  }

  if (fieldType === "number" || typeof value === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(numeric)) {
      if (options.displayFormat === "percentage") {
        const percentValue = numeric * 100;
        return `${formatNumberDisplayValue(percentValue, { locale })}%`;
      }
      const formatted = formatNumberDisplayValue(numeric, { locale });
      if (
        isCurrencyField(fieldType, options.fieldName, options.displayFormat)
      ) {
        return `$ ${formatted}`;
      }
      return formatted;
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(", ");
  }

  return String(value);
}
