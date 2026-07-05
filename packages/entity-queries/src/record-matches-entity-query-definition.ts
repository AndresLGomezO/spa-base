import type { FilterOperator } from "./filter-tree.js";
import { isFilterCondition } from "./filter-tree.js";

import {
  expandRelationFiltersInTree,
  type ExpandRelationFiltersInTreeInput,
} from "./expand-relation-filters.js";
import { buildIntrinsicQueryParameterMap } from "./query-parameter-resolution.js";
import { isEmptyFilterTree } from "./filter-tree-utils.js";
import type { EntityCatalogEntry } from "./relation-field-path.js";
import type {
  EntityQueryDefinitionRecord,
  EntityQueryFilterNode,
} from "./types.js";
import type { BuildQueryConfigOptions } from "./build-query-config.js";
import type { FilterNode } from "./filter-tree.js";

export interface RecordMatchesEntityQueryDefinitionInput {
  readonly record: Record<string, unknown>;
  readonly definition: Pick<
    EntityQueryDefinitionRecord,
    "sourceEntity" | "filter" | "parameters"
  >;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly listChildRecords: ExpandRelationFiltersInTreeInput["listChildRecords"];
  readonly options?: BuildQueryConfigOptions;
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function evaluateCondition(
  record: Record<string, unknown>,
  field: string,
  operator: FilterOperator,
  value: unknown,
): boolean {
  const fieldValue = record[field];
  switch (operator) {
    case "==":
      return fieldValue === value;
    case "!=":
      return fieldValue !== value;
    case "in":
      return Array.isArray(value) && value.includes(fieldValue as never);
    case ">":
      return compareValues(fieldValue, value) > 0;
    case ">=":
      return compareValues(fieldValue, value) >= 0;
    case "<":
      return compareValues(fieldValue, value) < 0;
    case "<=":
      return compareValues(fieldValue, value) <= 0;
    default:
      return false;
  }
}

export function evaluateEntityQueryFilterTree(
  record: Record<string, unknown>,
  node: FilterNode,
): boolean {
  if (isFilterCondition(node)) {
    return evaluateCondition(record, node.field, node.operator, node.value);
  }

  if (node.combinator === "and") {
    return node.children.every((child) =>
      evaluateEntityQueryFilterTree(record, child),
    );
  }

  return node.children.some((child) =>
    evaluateEntityQueryFilterTree(record, child),
  );
}

function collectFieldPathsFromNode(
  node: EntityQueryFilterNode,
  paths: Set<string>,
): void {
  if (node.type === "condition") {
    paths.add(node.field);
    return;
  }

  for (const child of node.children) {
    collectFieldPathsFromNode(child, paths);
  }
}

export function collectQueryFilterFieldPaths(
  definition: Pick<EntityQueryDefinitionRecord, "filter">,
): readonly string[] {
  const paths = new Set<string>();
  collectFieldPathsFromNode(definition.filter, paths);
  return [...paths];
}

export async function recordMatchesEntityQueryDefinition(
  input: RecordMatchesEntityQueryDefinitionInput,
): Promise<boolean> {
  if (isEmptyFilterTree(input.definition.filter)) {
    return true;
  }

  const parameters = input.definition.parameters ?? [];
  const intrinsicParameters = buildIntrinsicQueryParameterMap(
    input.record,
    parameters,
  );
  const options: BuildQueryConfigOptions = {
    ...input.options,
    parameters,
    parameterValues: {
      ...intrinsicParameters,
      ...(input.options?.parameterValues ?? {}),
    },
  };

  const expanded = await expandRelationFiltersInTree({
    sourceEntity: input.definition.sourceEntity,
    catalog: input.catalog,
    filter: input.definition.filter,
    listChildRecords: input.listChildRecords,
    options,
  });

  if (expanded.emptyResult) {
    return false;
  }

  if (!expanded.filterTree) {
    return true;
  }

  return evaluateEntityQueryFilterTree(input.record, expanded.filterTree);
}
