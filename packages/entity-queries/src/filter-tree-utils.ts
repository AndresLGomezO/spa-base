import { isFilterCondition, type FilterNode } from "./filter-tree.js";

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

export function isAlwaysFalseFilterNode(node: FilterNode): boolean {
  if (isFilterCondition(node)) {
    return (
      node.field === "id" &&
      node.operator === "in" &&
      Array.isArray(node.value) &&
      node.value.length === 1 &&
      node.value[0] === "__entity_query_no_match__"
    );
  }

  if (node.combinator === "and") {
    return node.children.some(isAlwaysFalseFilterNode);
  }

  return (
    node.children.length > 0 && node.children.every(isAlwaysFalseFilterNode)
  );
}
