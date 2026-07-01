import {
  createEmptyAndGroup,
  isEmptyFilterTree,
  type FilterNode,
} from "@repo/entity-queries";
import type { EntityQuerySort } from "@repo/entity-queries";

import type {
  RuntimeQueryConfig,
  RuntimeQueryFilter,
  RuntimeQuerySort,
} from "./runtime-query-types.js";

function flatFiltersToTree(filters: readonly RuntimeQueryFilter[]): FilterNode {
  return {
    type: "group",
    combinator: "and",
    children: filters.map((filter) => ({
      type: "condition" as const,
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
    })) as FilterNode[],
  };
}

function runtimeFilterToTree(
  filter: RuntimeQueryConfig["filter"],
): FilterNode | undefined {
  if (!filter) {
    return undefined;
  }

  if (Array.isArray(filter)) {
    if (filter.length === 0) {
      return undefined;
    }
    return flatFiltersToTree(filter);
  }

  const filterNode = filter as FilterNode;
  return isEmptyFilterTree(filterNode) ? undefined : filterNode;
}

function mergeFilterTrees(
  savedFilter: FilterNode | undefined,
  runtimeFilter: FilterNode | undefined,
): FilterNode | undefined {
  const children: FilterNode[] = [];

  if (savedFilter && !isEmptyFilterTree(savedFilter)) {
    children.push(savedFilter);
  }

  if (runtimeFilter && !isEmptyFilterTree(runtimeFilter)) {
    children.push(runtimeFilter);
  }

  if (children.length === 0) {
    return undefined;
  }

  if (children.length === 1) {
    return children[0];
  }

  return {
    type: "group",
    combinator: "and",
    children,
  };
}

export interface MergeSavedQueryWithRuntimeQueryInput {
  readonly savedFilterTree: FilterNode | null | undefined;
  readonly definitionSort: readonly EntityQuerySort[];
  readonly definitionSelect?: readonly string[];
  readonly runtimeQuery: RuntimeQueryConfig;
}

export function mergeSavedQueryWithRuntimeQuery(
  input: MergeSavedQueryWithRuntimeQueryInput,
): RuntimeQueryConfig {
  const { savedFilterTree, definitionSort, definitionSelect, runtimeQuery } =
    input;

  const savedFilter =
    savedFilterTree && !isEmptyFilterTree(savedFilterTree)
      ? savedFilterTree
      : undefined;
  const runtimeFilter = runtimeFilterToTree(runtimeQuery.filter);
  const mergedFilter = mergeFilterTrees(savedFilter, runtimeFilter);

  const runtimeSort = runtimeQuery.sort ?? [];
  const sort: readonly RuntimeQuerySort[] | undefined =
    runtimeSort.length > 0
      ? runtimeSort
      : definitionSort.length > 0
        ? definitionSort
        : undefined;

  const select =
    definitionSelect && definitionSelect.length > 0
      ? definitionSelect
      : runtimeQuery.select;

  return {
    ...(mergedFilter ? { filter: mergedFilter } : {}),
    ...(sort && sort.length > 0 ? { sort } : {}),
    ...(runtimeQuery.search ? { search: runtimeQuery.search } : {}),
    ...(select && select.length > 0 ? { select } : {}),
    pagination: runtimeQuery.pagination ?? { limit: 10 },
  };
}

export function savedQueryEmptyResult(
  savedFilterTree: FilterNode | null | undefined,
): boolean {
  if (!savedFilterTree) {
    return false;
  }

  return (
    savedFilterTree.type === "condition" &&
    savedFilterTree.field === "id" &&
    savedFilterTree.operator === "in" &&
    Array.isArray(savedFilterTree.value) &&
    savedFilterTree.value.length === 1 &&
    savedFilterTree.value[0] === "__entity_query_no_match__"
  );
}

export { createEmptyAndGroup };
