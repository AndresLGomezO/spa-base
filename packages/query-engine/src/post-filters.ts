import type { NormalizedFilter } from "@repo/firestore-converters";

/** Sentinel field for document-wide in-memory search post-filters. */
export const SEARCH_SOURCE_FIELDS_FILTER_FIELD = "__searchSourceFields__";

export interface SearchSourceFieldsContainValue {
  readonly term: string;
  /** When set, only these fields are searched (legacy per-field mode). */
  readonly fields?: readonly string[];
  /** Omitted from the concatenated haystack (e.g. sensitive columns). */
  readonly excludeFields?: readonly string[];
}

const POST_FILTER_OVERFETCH_MULTIPLIER = 3;

function isSearchMirrorStorageKey(key: string): boolean {
  return (
    key.endsWith("SearchTokens") || (key.endsWith("Search") && key !== "search")
  );
}

function isSearchSourceFieldsContainValue(
  value: unknown,
): value is SearchSourceFieldsContainValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SearchSourceFieldsContainValue;
  if (typeof candidate.term !== "string") {
    return false;
  }

  if (candidate.fields === undefined) {
    return true;
  }

  return (
    Array.isArray(candidate.fields) &&
    candidate.fields.every((field) => typeof field === "string")
  );
}

export function normalizeValueForDocumentSearch(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase();
  }

  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValueForDocumentSearch).join("");
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(normalizeValueForDocumentSearch)
      .join("");
  }

  return "";
}

export function buildNormalizedDocumentSearchText(
  record: Record<string, unknown>,
  options: { readonly excludeFields?: readonly string[] } = {},
): string {
  const exclude = new Set(options.excludeFields ?? []);
  let haystack = "";

  for (const [key, value] of Object.entries(record)) {
    if (exclude.has(key) || key === "_schemaVersion") {
      continue;
    }
    if (isSearchMirrorStorageKey(key)) {
      continue;
    }

    haystack += normalizeValueForDocumentSearch(value);
  }

  return haystack;
}

function buildFieldSearchHaystack(
  record: Record<string, unknown>,
  fields: readonly string[],
): string {
  let haystack = "";
  for (const field of fields) {
    haystack += normalizeValueForDocumentSearch(record[field]);
  }
  return haystack;
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

    const haystack =
      filter.value.fields && filter.value.fields.length > 0
        ? buildFieldSearchHaystack(record, filter.value.fields)
        : buildNormalizedDocumentSearchText(record, {
            excludeFields: filter.value.excludeFields,
          });

    return haystack.includes(term);
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
