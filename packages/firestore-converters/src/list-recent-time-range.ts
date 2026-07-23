export interface ListRecentTimeRangeOptions {
  readonly since?: string;
  readonly until?: string;
}

export function isIsoWithinTimeRange(
  iso: string,
  options?: ListRecentTimeRangeOptions,
): boolean {
  if (!options?.since && !options?.until) {
    return true;
  }
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) {
    return false;
  }
  if (options.since) {
    const sinceMs = Date.parse(options.since);
    if (Number.isFinite(sinceMs) && value < sinceMs) {
      return false;
    }
  }
  if (options.until) {
    const untilMs = Date.parse(options.until);
    if (Number.isFinite(untilMs) && value > untilMs) {
      return false;
    }
  }
  return true;
}
