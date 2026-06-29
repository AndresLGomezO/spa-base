/** Filter tree types for entity query definitions (Firestore-native operators only). */

export type FilterOperator = "==" | "!=" | ">" | "<" | ">=" | "<=" | "in";

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

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return node.type === "group";
}

export function isFilterCondition(node: FilterNode): node is FilterCondition {
  return node.type === "condition";
}

export function createEmptyAndGroup(): FilterGroup {
  return { type: "group", combinator: "and", children: [] };
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
