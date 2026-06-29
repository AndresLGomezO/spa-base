import type { FilterNode } from "./filter-tree.js";

import { resolveTemporalPreset } from "./temporal.js";
import type {
  EntityQueryDefinitionRecord,
  EntityQueryFilterCondition,
  EntityQueryFilterNode,
  EntityQueryFilterValue,
} from "./types.js";
import { isEmptyFilterTree } from "./filter-tree-utils.js";

export interface ResolvedEntityQueryConfig {
  readonly filter?: FilterNode;
  readonly sort?: readonly {
    readonly field: string;
    readonly direction: "asc" | "desc";
  }[];
  readonly select?: readonly string[];
  readonly pagination?: {
    readonly limit: number;
  };
}

export interface BuildQueryConfigOptions {
  readonly now?: Date;
}

export function resolveEntityQueryFilterValue(
  value: EntityQueryFilterValue,
  options: BuildQueryConfigOptions = {},
): unknown {
  if (value.type === "temporal") {
    return resolveTemporalPreset(value.preset, options.now);
  }

  return value.value;
}

export function buildQueryConfigFromDefinition(
  definition: Pick<
    EntityQueryDefinitionRecord,
    "filter" | "sort" | "select" | "limitMode" | "limit"
  >,
  options: BuildQueryConfigOptions = {},
): ResolvedEntityQueryConfig {
  const mappedFilter = mapFilterNode(definition.filter, options);
  const filter =
    mappedFilter && !isEmptyFilterTree(mappedFilter) ? mappedFilter : undefined;

  const sort = definition.sort.length > 0 ? [...definition.sort] : undefined;

  const select =
    definition.select && definition.select.length > 0
      ? [...definition.select]
      : undefined;

  const pagination =
    definition.limitMode === "topN" && definition.limit !== undefined
      ? { limit: definition.limit }
      : undefined;

  return {
    ...(filter ? { filter } : {}),
    ...(sort ? { sort } : {}),
    ...(select ? { select } : {}),
    ...(pagination ? { pagination } : {}),
  };
}

function mapFilterNode(
  node: EntityQueryFilterNode,
  options: BuildQueryConfigOptions,
): FilterNode | undefined {
  if (node.type === "condition") {
    return mapCondition(node, options);
  }

  const children = node.children
    .map((child) => mapFilterNode(child, options))
    .filter((child): child is FilterNode => child !== undefined);

  if (children.length === 0) {
    return undefined;
  }

  return {
    type: "group",
    combinator: node.combinator,
    children,
  };
}

function mapCondition(
  filter: EntityQueryFilterCondition,
  options: BuildQueryConfigOptions,
): FilterNode {
  return {
    type: "condition",
    field: filter.field,
    operator: filter.operator,
    value: resolveEntityQueryFilterValue(filter.value, options),
  };
}
