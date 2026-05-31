const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/** True only for YYYY-MM-DD or ISO-8601 datetime strings — not loose Date.parse matches like "test 1". */
export function isIsoDatetimeString(value: string): boolean {
  const trimmed = value.trim();
  if (!ISO_DATETIME_PATTERN.test(trimmed)) {
    return false;
  }
  return !Number.isNaN(Date.parse(trimmed));
}
