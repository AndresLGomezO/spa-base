import { resolveFilterBindingMap } from "@repo/entity-queries";
import type { FilterBindingSource } from "@repo/entities";
import {
  aggregateEntityQueryResults,
  buildExpandedQueryConfig,
  expandRelationFiltersInTree,
  applyRelationSortToItems,
  isRelationSortField,
  ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
} from "@repo/entity-queries/browser";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { buildManyToOnePopulateParam } from "../../entities/build-many-to-one-populate-param";
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

/** Anchor temporal presets to the dashboard date filter when present. */
export function resolveQueryExecutionNow(context?: PageFilterContext): Date {
  const filter = context?.dashboardDateFilter;
  if (!filter?.value) {
    return new Date();
  }

  const value = filter.value.trim();

  switch (filter.granularity) {
    case "month": {
      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (match) {
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15));
      }
      break;
    }
    case "year": {
      const match = /^(\d{4})$/.exec(value);
      if (match) {
        return new Date(Date.UTC(Number(match[1]), 6, 15));
      }
      break;
    }
    case "day": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (match) {
        return new Date(
          Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            12,
          ),
        );
      }
      break;
    }
  }

  return new Date();
}

export function isAggregatedEntityQueryDefinition(
  definition: Pick<
    EntityQueryDefinitionRecord,
    "queryMode" | "groupBy" | "aggregations"
  >,
): boolean {
  if (definition.queryMode === "aggregated") {
    return true;
  }

  return (
    (definition.groupBy?.length ?? 0) > 0 &&
    (definition.aggregations?.length ?? 0) > 0
  );
}

export async function executeEntityQueryDefinition(
  definition: EntityQueryDefinitionRecord,
  catalog: readonly EntityCatalogEntry[],
  options: {
    readonly parameterBindings?: Readonly<Record<string, FilterBindingSource>>;
    readonly context?: PageFilterContext;
  } = {},
): Promise<readonly Record<string, unknown>[]> {
  const hasParameterBindings =
    options.parameterBindings !== undefined &&
    Object.keys(options.parameterBindings).length > 0;

  let parameterValues:
    | Record<string, string | number | boolean | readonly string[]>
    | undefined;

  if (hasParameterBindings) {
    if (!options.context) {
      return [];
    }

    const resolved = resolveFilterBindingMap(
      options.parameterBindings!,
      options.context,
      {},
    );
    if (resolved === null) {
      return [];
    }

    parameterValues = resolved;
  }

  const buildOptions = {
    now: resolveQueryExecutionNow(options.context),
    parameterValues,
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

  const sourcePopulate = buildManyToOnePopulateParam(
    tryGetEntityDefinition(definition.sourceEntity, catalog),
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
        populate: sourcePopulate,
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
    return finalizeEntityQueryResults(definition, items);
  }

  const page = await listEntity<Record<string, unknown>>(
    definition.sourceEntity,
    {
      limit: definition.limit,
      query: queryConfig,
      populate: sourcePopulate,
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
  return finalizeEntityQueryResults(definition, items);
}

function shouldAggregateEntityQueryResults(
  definition: EntityQueryDefinitionRecord,
): boolean {
  return isAggregatedEntityQueryDefinition(definition);
}

function finalizeEntityQueryResults(
  definition: EntityQueryDefinitionRecord,
  items: readonly Record<string, unknown>[],
): readonly Record<string, unknown>[] {
  if (!shouldAggregateEntityQueryResults(definition)) {
    return items;
  }

  return aggregateEntityQueryResults(items, {
    groupBy: definition.groupBy ?? [],
    aggregations: definition.aggregations ?? [],
    groupSort: definition.groupSort ?? [],
    ...(definition.groupLimit !== undefined
      ? { groupLimit: definition.groupLimit }
      : {}),
  });
}
