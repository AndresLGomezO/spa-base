import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildDefaultEntityQueryParameterValues,
  expandRelationFiltersInTree,
  ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
} from "@repo/entity-queries/browser";
import {
  mergeSavedQueryWithRuntimeQuery,
  savedQueryEmptyResult,
  type RuntimeQueryConfig,
} from "@repo/custom-views/browser";
import type { QueryConfig } from "@repo/query-engine";

import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import {
  getEntityQueryDefinition,
  type CustomViewRecord,
} from "../lib/api-client";
import { fetchAllEntityItems } from "../lib/fetch-all-entity-items";
import { resolveQueryExpansionCatalog } from "../lib/resolve-query-expansion-catalog";
import { useServerQueryConfig } from "../hooks/useServerQueryConfig";
import type { DataViewSortState } from "@repo/data-view";

interface UseCustomViewMergedQueryConfigInput {
  readonly customView: CustomViewRecord | undefined;
  readonly sourceDefinition?: EntityCatalogEntry;
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly limit: number;
  readonly offset?: number;
  readonly fieldTypes?: Readonly<Record<string, string>>;
}

export function useCustomViewMergedQueryConfig(
  input: UseCustomViewMergedQueryConfigInput,
): {
  readonly queryConfig: QueryConfig | undefined;
  readonly isLoading: boolean;
  readonly isEmptyResult: boolean;
  readonly error: string | null;
} {
  const { items: catalogItems } = useEntityCatalog();
  const runtimeQuery = useServerQueryConfig({
    search: input.search,
    filters: input.filters,
    sort: input.sort,
    limit: input.limit,
    offset: input.offset,
    fieldTypes: input.fieldTypes,
  });

  const queryDefinitionQuery = useQuery({
    queryKey: [
      "entity-query-definition",
      input.customView?.entityQueryDefinitionId,
    ],
    queryFn: () =>
      getEntityQueryDefinition(input.customView!.entityQueryDefinitionId),
    enabled: Boolean(input.customView?.entityQueryDefinitionId),
  });

  const expandedFiltersQuery = useQuery({
    queryKey: [
      "custom-view-expanded-filters",
      input.customView?.id,
      queryDefinitionQuery.data?.updatedAt,
      queryDefinitionQuery.data?.filter,
      input.sourceDefinition?.name,
      catalogItems.map((entry) => entry.name).join(","),
    ],
    queryFn: async () => {
      const definition = queryDefinitionQuery.data!;
      const now = new Date();
      const parameterValues = buildDefaultEntityQueryParameterValues(
        definition.parameters ?? [],
        { now },
      );
      const expansionCatalog = await resolveQueryExpansionCatalog({
        baseCatalog: catalogItems,
        sourceEntity: definition.sourceEntity,
        sourceDefinition: input.sourceDefinition,
        filter: definition.filter,
      });

      return expandRelationFiltersInTree({
        sourceEntity: definition.sourceEntity,
        catalog: expansionCatalog,
        filter: definition.filter,
        options: {
          now,
          parameters: definition.parameters ?? [],
          parameterValues,
        },
        listChildRecords: async (entityName, query) =>
          fetchAllEntityItems<Record<string, unknown>>(entityName, {
            maxItems: ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
            query: { filter: [...query.filter] },
          }),
      });
    },
    enabled: Boolean(queryDefinitionQuery.data),
  });

  return useMemo(() => {
    const queryError =
      queryDefinitionQuery.error instanceof Error
        ? queryDefinitionQuery.error.message
        : expandedFiltersQuery.error instanceof Error
          ? expandedFiltersQuery.error.message
          : null;

    if (!input.customView || !queryDefinitionQuery.data) {
      return {
        queryConfig: undefined,
        isLoading:
          queryDefinitionQuery.isLoading || expandedFiltersQuery.isLoading,
        isEmptyResult: false,
        error: queryError,
      };
    }

    if (expandedFiltersQuery.isLoading) {
      return {
        queryConfig: undefined,
        isLoading: true,
        isEmptyResult: false,
        error: queryError,
      };
    }

    if (expandedFiltersQuery.isError || !expandedFiltersQuery.data) {
      return {
        queryConfig: undefined,
        isLoading: false,
        isEmptyResult: false,
        error: queryError,
      };
    }

    if (
      expandedFiltersQuery.data.emptyResult ||
      savedQueryEmptyResult(expandedFiltersQuery.data.filterTree)
    ) {
      return {
        queryConfig: {
          filter: [
            {
              field: "id",
              operator: "in",
              value: ["__entity_query_no_match__"],
            },
          ],
          pagination: runtimeQuery.pagination ?? { limit: input.limit },
        },
        isLoading: false,
        isEmptyResult: true,
        error: null,
      };
    }

    const merged = mergeSavedQueryWithRuntimeQuery({
      savedFilterTree: expandedFiltersQuery.data.filterTree,
      definitionSort: queryDefinitionQuery.data.sort,
      definitionSelect: queryDefinitionQuery.data.select,
      runtimeQuery: runtimeQuery as RuntimeQueryConfig,
    });

    return {
      queryConfig: merged as QueryConfig,
      isLoading: false,
      isEmptyResult: false,
      error: null,
    };
  }, [
    expandedFiltersQuery.data,
    expandedFiltersQuery.error,
    expandedFiltersQuery.isError,
    expandedFiltersQuery.isLoading,
    input.customView,
    input.limit,
    queryDefinitionQuery.data,
    queryDefinitionQuery.error,
    queryDefinitionQuery.isLoading,
    runtimeQuery,
  ]);
}
