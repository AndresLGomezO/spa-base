import {
  indexForQueryShape,
  matchesPlannedIndex,
  type FirestoreCompositeIndex,
  type IndexMatchQuery,
} from "@repo/firestore-indexes";
import type { NormalizedEntityQuery } from "@repo/firestore-converters";

const OWNERSHIP_FIELD = "accessUserIds";

const INEQUALITY_OPERATORS = new Set(["!=", ">", "<", ">=", "<="]);

export function queryShapeFromNormalized(
  query: NormalizedEntityQuery,
  tenantWideRead: boolean,
): IndexMatchQuery {
  const equalityFilterFields = query.filters
    .filter(
      (filter) =>
        filter.field !== OWNERSHIP_FIELD &&
        filter.operator !== "array-contains" &&
        !INEQUALITY_OPERATORS.has(filter.operator),
    )
    .map((filter) => filter.field);

  const sort = query.sort ?? { field: "id", direction: "asc" as const };

  return {
    tenantWideRead,
    equalityFilterFields,
    sortField: sort.field,
    sortDirection: sort.direction === "desc" ? "DESCENDING" : "ASCENDING",
  };
}

export { matchesPlannedIndex } from "@repo/firestore-indexes";

export function queryMatchesPlannedIndexes(
  collection: string,
  plannedIndexes: readonly FirestoreCompositeIndex[],
  query: NormalizedEntityQuery,
  tenantWideRead: boolean,
): boolean {
  return matchesPlannedIndex(
    collection,
    plannedIndexes,
    queryShapeFromNormalized(query, tenantWideRead),
  );
}

export function buildBaselineListQueryShape(
  tenantWideRead: boolean,
): IndexMatchQuery {
  return {
    tenantWideRead,
    equalityFilterFields: [],
    sortField: "id",
    sortDirection: "ASCENDING",
  };
}

export function baselineListIndex(
  collection: string,
  tenantWideRead: boolean,
): FirestoreCompositeIndex {
  return indexForQueryShape(
    collection,
    buildBaselineListQueryShape(tenantWideRead),
  );
}

export function queryNeedsClientFallback(
  query: NormalizedEntityQuery,
  collection: string,
  plannedIndexes: readonly FirestoreCompositeIndex[],
  tenantWideRead: boolean,
): boolean {
  if (query.search) {
    return false;
  }

  if (query.postFilters.length > 0) {
    return false;
  }

  const hasInequality = query.filters.some((filter) =>
    INEQUALITY_OPERATORS.has(filter.operator),
  );
  if (hasInequality) {
    return true;
  }

  return !queryMatchesPlannedIndexes(
    collection,
    plannedIndexes,
    query,
    tenantWideRead,
  );
}
