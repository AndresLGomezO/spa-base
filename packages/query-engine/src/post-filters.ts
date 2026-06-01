import type { NormalizedFilter } from "@repo/firestore-converters";

const POST_FILTER_OVERFETCH_MULTIPLIER = 3;

export function computeOverfetchLimit(
  requestedLimit: number,
  hasPostFilters: boolean,
): number {
  if (!hasPostFilters) {
    return requestedLimit;
  }
  return requestedLimit * POST_FILTER_OVERFETCH_MULTIPLIER;
}

function matchesPostFilter(
  record: Record<string, unknown>,
  filter: NormalizedFilter,
): boolean {
  if (typeof filter.value !== "string") {
    return false;
  }

  const rawValue = record[filter.field];
  const filterValue = filter.value.toLowerCase();

  if (filter.operator === "tokenStartsWith") {
    if (!Array.isArray(rawValue)) {
      return false;
    }

    return rawValue.some(
      (token) => typeof token === "string" && token.startsWith(filterValue),
    );
  }

  if (typeof rawValue !== "string") {
    return false;
  }

  const fieldValue = rawValue.toLowerCase();

  switch (filter.operator) {
    case "contains":
      return fieldValue.includes(filterValue);
    case "startsWith":
      return fieldValue.startsWith(filterValue);
    case "endsWith":
      return fieldValue.endsWith(filterValue);
    default:
      return true;
  }
}

export function applyPostFilters(
  items: readonly Record<string, unknown>[],
  postFilters: readonly NormalizedFilter[],
): Record<string, unknown>[] {
  if (postFilters.length === 0) {
    return [...items];
  }

  return items.filter((item) =>
    postFilters.every((filter) => matchesPostFilter(item, filter)),
  );
}
