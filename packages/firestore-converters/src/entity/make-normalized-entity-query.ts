import { migrateFlatFiltersToTree } from "../filter-tree.js";
import type { NormalizedEntityQuery } from "./entity-query-contract.js";

export function makeNormalizedEntityQuery(
  query: Omit<NormalizedEntityQuery, "filterTree" | "postFilterTree">,
): NormalizedEntityQuery {
  return {
    ...query,
    filterTree:
      query.filters.length > 0 ? migrateFlatFiltersToTree(query.filters) : null,
    postFilterTree:
      query.postFilters.length > 0
        ? migrateFlatFiltersToTree(query.postFilters)
        : null,
  };
}
