import {
  isFilterCondition,
  type FilterOperator,
  type NormalizedFilterNode,
} from "@repo/firestore-converters";
import { Filter } from "firebase-admin/firestore";

function toWhereFilter(
  field: string,
  operator: FilterOperator,
  value: unknown,
): Filter {
  if (operator === "in") {
    return Filter.where(field, "in", value as unknown[]);
  }

  return Filter.where(
    field,
    operator as FirebaseFirestore.WhereFilterOp,
    value,
  );
}

export function buildFirestoreCompositeFilter(
  node: NormalizedFilterNode | null,
): Filter | undefined {
  if (!node) {
    return undefined;
  }

  if (isFilterCondition(node)) {
    return toWhereFilter(node.field, node.operator, node.value);
  }

  const childFilters = node.children
    .map((child) => buildFirestoreCompositeFilter(child))
    .filter((filter): filter is Filter => filter !== undefined);

  if (childFilters.length === 0) {
    return undefined;
  }

  if (childFilters.length === 1) {
    return childFilters[0];
  }

  return node.combinator === "or"
    ? Filter.or(...childFilters)
    : Filter.and(...childFilters);
}

export function filterTreeHasOrCombinator(
  node: NormalizedFilterNode | null,
): boolean {
  if (!node || isFilterCondition(node)) {
    return false;
  }

  if (node.combinator === "or") {
    return true;
  }

  return node.children.some((child) => filterTreeHasOrCombinator(child));
}
