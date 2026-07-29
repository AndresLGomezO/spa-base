import {
  isFilterCondition,
  isFilterGroup,
  type FilterNode,
  type NormalizedFilterNode,
} from "@repo/firestore-converters/filter-tree";
import {
  isPostFilterOperator,
  type NormalizedFilter,
  type NormalizedSort,
} from "@repo/firestore-converters/entity-query-contract";
import { compareFilterValues } from "@repo/entity-queries";

import { QueryError, QueryErrorCode } from "./errors.js";
import { applyPostFilters } from "./post-filters.js";

const INEQUALITY_OPERATORS = new Set(["!=", ">", "<", ">=", "<="]);

function compareValues(left: unknown, right: unknown): number {
  return compareFilterValues(left, right);
}

function evaluateCondition(
  record: Record<string, unknown>,
  filter: NormalizedFilter,
): boolean {
  const value = record[filter.field];
  switch (filter.operator) {
    case "==":
      return value === filter.value;
    case "!=":
      return value !== filter.value;
    case "in":
      return (
        Array.isArray(filter.value) && filter.value.includes(value as never)
      );
    case ">":
      return compareValues(value, filter.value) > 0;
    case ">=":
      return compareValues(value, filter.value) >= 0;
    case "<":
      return compareValues(value, filter.value) < 0;
    case "<=":
      return compareValues(value, filter.value) <= 0;
    case "array-contains":
      return Array.isArray(value) && value.includes(filter.value as never);
    default:
      return true;
  }
}

export function evaluateFilterTree(
  record: Record<string, unknown>,
  node: NormalizedFilterNode,
  postFilterEvaluator?: (
    record: Record<string, unknown>,
    filter: NormalizedFilter,
  ) => boolean,
): boolean {
  if (isFilterCondition(node)) {
    if (isPostFilterOperator(node.operator)) {
      if (!postFilterEvaluator) {
        return true;
      }
      return postFilterEvaluator(record, node);
    }
    return evaluateCondition(record, node);
  }

  if (node.combinator === "and") {
    return node.children.every((child) =>
      evaluateFilterTree(record, child, postFilterEvaluator),
    );
  }

  return node.children.some((child) =>
    evaluateFilterTree(record, child, postFilterEvaluator),
  );
}

export function partitionFilterTree(node: FilterNode): {
  readonly nativeTree: NormalizedFilterNode | null;
  readonly postFilterTree: NormalizedFilterNode | null;
} {
  if (isFilterCondition(node)) {
    if (isPostFilterOperator(node.operator)) {
      return { nativeTree: null, postFilterTree: node };
    }
    return { nativeTree: node, postFilterTree: null };
  }

  const nativeChildren: NormalizedFilterNode[] = [];
  const postChildren: NormalizedFilterNode[] = [];

  for (const child of node.children) {
    const partitioned = partitionFilterTree(child);
    if (partitioned.nativeTree) {
      nativeChildren.push(partitioned.nativeTree);
    }
    if (partitioned.postFilterTree) {
      postChildren.push(partitioned.postFilterTree);
    }
  }

  const nativeTree =
    nativeChildren.length > 0
      ? {
          type: "group" as const,
          combinator: node.combinator,
          children: nativeChildren,
        }
      : null;

  const postFilterTree =
    postChildren.length > 0
      ? {
          type: "group" as const,
          combinator: node.combinator,
          children: postChildren,
        }
      : null;

  return { nativeTree, postFilterTree };
}

function collectInequalityFields(
  node: NormalizedFilterNode | null,
): Set<string> {
  const fields = new Set<string>();
  if (!node) {
    return fields;
  }

  if (isFilterCondition(node)) {
    if (INEQUALITY_OPERATORS.has(node.operator)) {
      fields.add(node.field);
    }
    return fields;
  }

  for (const child of node.children) {
    for (const field of collectInequalityFields(child)) {
      fields.add(field);
    }
  }
  return fields;
}

export type QueryExecutionMode = "native" | "rangeResort";

export interface EnforcedSortConstraints {
  readonly sort: NormalizedSort;
  readonly executionMode: QueryExecutionMode;
  /** Firestore orderBy used when scanning a range before in-memory resort. */
  readonly scanSort?: NormalizedSort;
}

export function enforceFirestoreConstraintsOnTree(
  filterTree: NormalizedFilterNode | null,
  sort: NormalizedSort | null,
): EnforcedSortConstraints {
  const inequalityFields = collectInequalityFields(filterTree);
  if (inequalityFields.size > 1) {
    throw new QueryError(
      QueryErrorCode.QUERY_UNSUPPORTED,
      "Inequality filters on multiple fields are not supported. All range filters must target the same field.",
    );
  }

  const inequalityField =
    inequalityFields.size === 1 ? [...inequalityFields][0] : undefined;

  if (!inequalityField) {
    return {
      sort: sort ?? { field: "id", direction: "asc" },
      executionMode: "native",
    };
  }

  const primarySort = sort ?? {
    field: inequalityField,
    direction: "asc" as const,
  };

  if (primarySort.field === inequalityField) {
    return {
      sort: primarySort,
      executionMode: "native",
    };
  }

  return {
    sort: primarySort,
    executionMode: "rangeResort",
    scanSort: {
      field: inequalityField,
      direction: "asc",
    },
  };
}

export function treeContainsPostFilters(
  node: NormalizedFilterNode | null,
): boolean {
  if (!node) {
    return false;
  }
  if (isFilterCondition(node)) {
    return isPostFilterOperator(node.operator);
  }
  return node.children.some((child) => treeContainsPostFilters(child));
}

export function treeRequiresInMemoryExecution(
  filterTree: NormalizedFilterNode | null,
  postFilterTree: NormalizedFilterNode | null,
): boolean {
  return treeContainsPostFilters(filterTree) || postFilterTree !== null;
}

export function applyPostFilterTree(
  items: readonly Record<string, unknown>[],
  postFilterTree: NormalizedFilterNode | null,
): Record<string, unknown>[] {
  if (!postFilterTree) {
    return [...items];
  }

  const postEvaluator = (
    record: Record<string, unknown>,
    filter: NormalizedFilter,
  ): boolean => {
    const filtered = applyPostFilters([record], [filter]);
    return filtered.length > 0;
  };

  return items.filter((item) =>
    evaluateFilterTree(item, postFilterTree, postEvaluator),
  );
}

export function mergeFilterTrees(
  left: NormalizedFilterNode | null | undefined,
  right: NormalizedFilterNode | null | undefined,
): NormalizedFilterNode | null {
  if (!left) {
    return right ?? null;
  }
  if (!right) {
    return left;
  }

  if (isFilterGroup(left) && left.combinator === "and") {
    return {
      type: "group",
      combinator: "and",
      children: [...left.children, right],
    };
  }

  return {
    type: "group",
    combinator: "and",
    children: [left, right],
  };
}
