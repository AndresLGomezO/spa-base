import { resolveFilterBindingMap } from "@repo/entity-queries";
import type { FilterBindingSource } from "@repo/entities";
import {
  buildExpandedQueryConfig,
  expandRelationFiltersInTree,
  applyRelationSortToItems,
  isRelationSortField,
  ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
} from "@repo/entity-queries/browser";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  fetchAllEntityItems,
  RELATION_FILTER_OPTIONS_MAX_ITEMS,
} from "../../lib/fetch-all-entity-items";
import {
  listEntity,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import { resolveQueryExpansionCatalog } from "../../lib/resolve-query-expansion-catalog";
import type { PageFilterContext } from "../../lib/metric-binding-resolution";

export async function executeEntityQueryDefinition(
  definition: EntityQueryDefinitionRecord,
  catalog: readonly EntityCatalogEntry[],
  options: {
    readonly parameterBindings?: Readonly<Record<string, FilterBindingSource>>;
    readonly context?: PageFilterContext;
  } = {},
): Promise<readonly Record<string, unknown>[]> {
  const parameterValues =
    options.parameterBindings && options.context
      ? resolveFilterBindingMap(options.parameterBindings, options.context, {})
      : null;

  const buildOptions = {
    parameterValues: parameterValues ?? undefined,
    parameters: definition.parameters ?? [],
  };

  const sort = definition.sort;
  const expansionCatalog = await resolveQueryExpansionCatalog({
    baseCatalog: catalog,
    sourceEntity: definition.sourceEntity,
    filter: definition.filter,
  });

  const expanded = await expandRelationFiltersInTree({
    sourceEntity: definition.sourceEntity,
    catalog: expansionCatalog,
    filter: definition.filter,
    listChildRecords: async (entityName, query) => {
      return fetchAllEntityItems<Record<string, unknown>>(entityName, {
        maxItems: ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
        query: { filter: [...query.filter] },
      });
    },
    options: buildOptions,
  });

  if (expanded.emptyResult) {
    return [];
  }

  const apiSort =
    sort.length > 0 &&
    !isRelationSortField(
      definition.sourceEntity,
      expansionCatalog,
      sort[0]?.field ?? "",
    )
      ? [...sort]
      : [];

  const queryConfig = buildExpandedQueryConfig(
    {
      filter: { type: "group", combinator: "and", children: [] },
      sort: apiSort,
      select: definition.select ? [...definition.select] : undefined,
      limitMode: definition.limitMode,
      limit: definition.limitMode === "topN" ? definition.limit : undefined,
    },
    expanded.filterTree,
  );

  const listChildRecords = async (
    entityName: string,
    query: {
      readonly filter: readonly {
        readonly field: string;
        readonly operator: "==" | "in";
        readonly value: unknown;
      }[];
    },
  ) => {
    return fetchAllEntityItems<Record<string, unknown>>(entityName, {
      maxItems: ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
      query: { filter: [...query.filter] },
    });
  };

  if (definition.limitMode === "all") {
    let items = await fetchAllEntityItems<Record<string, unknown>>(
      definition.sourceEntity,
      {
        maxItems: RELATION_FILTER_OPTIONS_MAX_ITEMS,
        query: queryConfig,
      },
    );
    if (sort.length > 0) {
      items = await applyRelationSortToItems({
        sourceEntity: definition.sourceEntity,
        catalog: expansionCatalog,
        items,
        sort,
        listRecords: listChildRecords,
      });
    }
    return items;
  }

  const page = await listEntity<Record<string, unknown>>(
    definition.sourceEntity,
    {
      limit: definition.limit,
      query: queryConfig,
    },
  );
  let items = page.items;
  if (sort.length > 0) {
    items = await applyRelationSortToItems({
      sourceEntity: definition.sourceEntity,
      catalog: expansionCatalog,
      items,
      sort,
      listRecords: listChildRecords,
    });
  }
  return items;
}
