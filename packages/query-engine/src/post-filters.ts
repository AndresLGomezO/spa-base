import type { NormalizedFilter } from "@repo/firestore-converters";

/** Sentinel field for multi-field in-memory search post-filters. */
export const SEARCH_SOURCE_FIELDS_FILTER_FIELD = "__searchSourceFields__";

export interface SearchSourceFieldsContainValue {
  readonly term: string;
  readonly fields: readonly string[];
}

const POST_FILTER_OVERFETCH_MULTIPLIER = 3;

function isSearchSourceFieldsContainValue(
  value: unknown,
): value is SearchSourceFieldsContainValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SearchSourceFieldsContainValue;
  return (
    typeof candidate.term === "string" &&
    Array.isArray(candidate.fields) &&
    candidate.fields.every((field) => typeof field === "string")
  );
}

function recordFieldContainsTerm(
  record: Record<string, unknown>,
  field: string,
  term: string,
): boolean {
  const rawValue = record[field];
  if (typeof rawValue !== "string") {
    return false;
  }

  return rawValue.toLowerCase().includes(term);
}

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
  if (filter.operator === "sourceFieldsContain") {
    if (!isSearchSourceFieldsContainValue(filter.value)) {
      return false;
    }

    const term = filter.value.term.toLowerCase();
    if (term.length === 0) {
      return true;
    }

    return filter.value.fields.some((field) =>
      recordFieldContainsTerm(record, field, term),
    );
  }

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
