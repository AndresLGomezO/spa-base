import type {
  FilterOperator,
  NormalizedFilter,
} from "./entity/entity-query-contract.js";

export type { FilterOperator } from "./entity/entity-query-contract.js";

export type FilterCombinator = "and" | "or";

export const MAX_FILTER_TREE_DEPTH = 10;
export const MAX_OR_DISJUNCTIONS = 30;

export interface FilterCondition {
  readonly type: "condition";
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export interface FilterGroup {
  readonly type: "group";
  readonly combinator: FilterCombinator;
  readonly children: readonly FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

export type NormalizedFilterCondition = FilterCondition;

export type NormalizedFilterGroup = FilterGroup;

export type NormalizedFilterNode = FilterCondition | FilterGroup;

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return node.type === "group";
}

export function isFilterCondition(node: FilterNode): node is FilterCondition {
  return node.type === "condition";
}

export function createEmptyAndGroup(): FilterGroup {
  return { type: "group", combinator: "and", children: [] };
}

export function migrateFlatFiltersToTree(
  filters: readonly {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
  }[],
): FilterGroup {
  return {
    type: "group",
    combinator: "and",
    children: filters.map((filter) => ({
      type: "condition",
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
    })),
  };
}

export function maxTreeDepth(
  node: FilterNode | null | undefined,
  depth = 1,
): number {
  if (!node) {
    return 0;
  }
  if (isFilterCondition(node)) {
    return depth;
  }
  if (node.children.length === 0) {
    return depth;
  }
  return Math.max(
    ...node.children.map((child) => maxTreeDepth(child, depth + 1)),
  );
}

export function countOrDisjunctions(
  node: FilterNode | null | undefined,
): number {
  if (!node) {
    return 0;
  }
  if (isFilterCondition(node)) {
    return 0;
  }
  let count = node.combinator === "or" ? 1 : 0;
  for (const child of node.children) {
    count += countOrDisjunctions(child);
  }
  return count;
}

export function walkConditions(
  node: FilterNode | null | undefined,
  visitor: (condition: FilterCondition) => void,
): void {
  if (!node) {
    return;
  }
  if (isFilterCondition(node)) {
    visitor(node);
    return;
  }
  for (const child of node.children) {
    walkConditions(child, visitor);
  }
}

export function flattenAndConditions(
  node: FilterNode | null | undefined,
): NormalizedFilter[] {
  if (!node) {
    return [];
  }
  if (isFilterCondition(node)) {
    return [
      {
        field: node.field,
        operator: node.operator,
        value: node.value,
      },
    ];
  }
  if (node.combinator === "or") {
    return [];
  }
  return node.children.flatMap((child) => flattenAndConditions(child));
}

export function isEmptyFilterTree(
  node: FilterNode | null | undefined,
): boolean {
  if (!node) {
    return true;
  }
  if (isFilterCondition(node)) {
    return node.field.trim().length === 0;
  }
  return node.children.length === 0;
}

export function normalizeLegacyQueryFilter(
  filter:
    | FilterNode
    | readonly {
        readonly field: string;
        readonly operator: FilterOperator;
        readonly value: unknown;
      }[]
    | undefined,
): FilterNode | undefined {
  if (!filter) {
    return undefined;
  }
  if (Array.isArray(filter)) {
    if (filter.length === 0) {
      return undefined;
    }
    return migrateFlatFiltersToTree(filter);
  }

  return filter as FilterNode;
}
