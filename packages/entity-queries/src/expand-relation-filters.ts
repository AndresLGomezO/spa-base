import type { FilterNode, FilterOperator } from "./filter-tree.js";
import { isFilterCondition } from "./filter-tree.js";

import {
  buildQueryConfigFromDefinition,
  resolveEntityQueryFilterValue,
  type BuildQueryConfigOptions,
} from "./build-query-config.js";
import { isAlwaysFalseFilterNode } from "./filter-tree-utils.js";
import type { EntityCatalogEntry } from "./relation-field-path.js";
import {
  parseQueryableRelationPath,
  type QueryableRelationPath,
} from "./relation-field-path.js";
import type {
  EntityQueryFilter,
  EntityQueryFilterCondition,
  EntityQueryFilterNode,
} from "./types.js";

export const ENTITY_QUERY_NO_MATCH_ID = "__entity_query_no_match__";

export const ENTITY_QUERY_RELATION_LIST_MAX_ITEMS = 500;

export interface ExpandRelationFiltersInTreeInput {
  readonly sourceEntity: string;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly filter: EntityQueryFilterNode;
  readonly listChildRecords: (
    entityName: string,
    query: {
      readonly filter: readonly {
        readonly field: string;
        readonly operator: FilterOperator;
        readonly value: unknown;
      }[];
    },
  ) => Promise<readonly Record<string, unknown>[]>;
  readonly options?: BuildQueryConfigOptions;
  readonly maxItems?: number;
}

export interface ExpandedRelationFiltersInTreeResult {
  readonly filterTree: FilterNode | null;
  readonly emptyResult: boolean;
}

function noMatchCondition(): FilterNode {
  return {
    type: "condition",
    field: "id",
    operator: "in",
    value: [ENTITY_QUERY_NO_MATCH_ID],
  };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function buildChildSubqueryFilter(
  relationPath: QueryableRelationPath,
  filter: EntityQueryFilterCondition,
  options: BuildQueryConfigOptions,
): {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
} {
  return {
    field: relationPath.subField,
    operator: filter.operator,
    value: resolveEntityQueryFilterValue(filter.value, options),
  };
}

async function expandCondition(
  input: ExpandRelationFiltersInTreeInput,
  sourceDefinition: EntityCatalogEntry,
  filter: EntityQueryFilterCondition,
): Promise<FilterNode> {
  const options = input.options ?? {};
  const maxItems = input.maxItems ?? ENTITY_QUERY_RELATION_LIST_MAX_ITEMS;

  const relationPath = parseQueryableRelationPath(
    sourceDefinition,
    input.catalog,
    filter.field,
  );

  if (!relationPath) {
    return {
      type: "condition",
      field: filter.field,
      operator: filter.operator,
      value: resolveEntityQueryFilterValue(filter.value, options),
    };
  }

  const childEntity =
    relationPath.kind === "many-to-one"
      ? relationPath.targetEntity
      : relationPath.childEntity;

  const childRecords = await input.listChildRecords(childEntity, {
    filter: [buildChildSubqueryFilter(relationPath, filter, options)],
  });

  if (relationPath.kind === "many-to-one") {
    const ids = uniqueStrings(
      childRecords
        .map((record) => record.id)
        .filter((id): id is string => typeof id === "string"),
    ).slice(0, maxItems);

    if (ids.length === 0) {
      return noMatchCondition();
    }

    return {
      type: "condition",
      field: relationPath.foreignKeyField,
      operator: "in",
      value: ids,
    };
  }

  const parentIds = uniqueStrings(
    childRecords
      .map((record) => record[relationPath.foreignKeyField])
      .filter((value): value is string => typeof value === "string"),
  ).slice(0, maxItems);

  if (parentIds.length === 0) {
    return noMatchCondition();
  }

  return {
    type: "condition",
    field: "id",
    operator: "in",
    value: parentIds,
  };
}

async function expandNode(
  input: ExpandRelationFiltersInTreeInput,
  sourceDefinition: EntityCatalogEntry,
  node: EntityQueryFilterNode,
): Promise<FilterNode | null> {
  if (node.type === "condition") {
    return expandCondition(input, sourceDefinition, node);
  }

  const expandedChildren = (
    await Promise.all(
      node.children.map((child) => expandNode(input, sourceDefinition, child)),
    )
  ).filter((child): child is FilterNode => child !== null);

  if (expandedChildren.length === 0) {
    return null;
  }

  return {
    type: "group",
    combinator: node.combinator,
    children: expandedChildren,
  };
}

export async function expandRelationFiltersInTree(
  input: ExpandRelationFiltersInTreeInput,
): Promise<ExpandedRelationFiltersInTreeResult> {
  const sourceDefinition = input.catalog.find(
    (entry) => entry.name === input.sourceEntity,
  );
  if (!sourceDefinition) {
    throw new Error(`Unknown source entity "${input.sourceEntity}".`);
  }

  const expanded = await expandNode(input, sourceDefinition, input.filter);
  if (!expanded) {
    return { filterTree: null, emptyResult: false };
  }

  return {
    filterTree: expanded,
    emptyResult: isAlwaysFalseFilterNode(expanded),
  };
}

/** @deprecated Use expandRelationFiltersInTree */
export interface ExpandRelationFiltersInput {
  readonly sourceEntity: string;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly filters: readonly EntityQueryFilter[];
  readonly listChildRecords: ExpandRelationFiltersInTreeInput["listChildRecords"];
  readonly options?: BuildQueryConfigOptions;
  readonly maxItems?: number;
}

/** @deprecated Use expandRelationFiltersInTree */
export interface ExpandedRelationFiltersResult {
  readonly filters: readonly {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
  }[];
  readonly emptyResult: boolean;
}

/** @deprecated Use expandRelationFiltersInTree */
export async function expandRelationFilters(
  input: ExpandRelationFiltersInput,
): Promise<ExpandedRelationFiltersResult> {
  const result = await expandRelationFiltersInTree({
    ...input,
    filter: {
      type: "group",
      combinator: "and",
      children: input.filters.map((filter) => ({
        type: "condition",
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      })),
    },
  });

  if (!result.filterTree) {
    return { filters: [], emptyResult: result.emptyResult };
  }

  const filters: Array<{
    field: string;
    operator: FilterOperator;
    value: unknown;
  }> = [];

  function collectFlat(node: FilterNode): void {
    if (isFilterCondition(node)) {
      filters.push({
        field: node.field,
        operator: node.operator,
        value: node.value,
      });
      return;
    }
    for (const child of node.children) {
      collectFlat(child);
    }
  }

  collectFlat(result.filterTree);
  return { filters, emptyResult: result.emptyResult };
}

export function buildExpandedQueryConfig(
  definition: Pick<
    import("./types.js").EntityQueryDefinitionRecord,
    "filter" | "sort" | "select" | "limitMode" | "limit"
  >,
  expandedFilterTree: FilterNode | null,
  options: BuildQueryConfigOptions = {},
): import("./build-query-config.js").ResolvedEntityQueryConfig {
  const base = buildQueryConfigFromDefinition(
    {
      filter: { type: "group", combinator: "and", children: [] },
      sort: definition.sort,
      select: definition.select,
      limitMode: definition.limitMode,
      limit: definition.limit,
    },
    options,
  );

  return {
    ...(expandedFilterTree ? { filter: expandedFilterTree } : {}),
    ...(base.sort ? { sort: base.sort } : {}),
    ...(base.select ? { select: base.select } : {}),
    ...(base.pagination ? { pagination: base.pagination } : {}),
  };
}
