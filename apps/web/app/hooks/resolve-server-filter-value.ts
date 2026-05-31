function isIsoDatetimeString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  );
}

/** Parses display-formatted date filter values from legacy URLs. */
export function parseDisplayDateFilterValue(value: string): string | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/,
  );
  if (!match) {
    return null;
  }

  const [, year, month, day, hourStr, minute, period] = match;
  let hour = Number(hourStr);
  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour,
      Number(minute),
    ),
  ).toISOString();
}

export function resolveServerFilterValue(
  fieldType: string | undefined,
  value: string,
): unknown {
  if (fieldType === "date" && !isIsoDatetimeString(value)) {
    const parsed = parseDisplayDateFilterValue(value);
    if (parsed) {
      return parsed;
    }
  }

  if (fieldType === "number") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }

  if (fieldType === "boolean") {
    return value === "true";
  }

  return value;
}
