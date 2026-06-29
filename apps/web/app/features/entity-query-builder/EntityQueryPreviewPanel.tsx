import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  buildExpandedQueryConfig,
  expandRelationFiltersInTree,
  applyRelationSortToItems,
  isRelationSortField,
  ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
} from "@repo/entity-queries/browser";
import { useTranslation } from "react-i18next";

import { Button, Text, toast } from "@repo/ui";

import { JsonTreeViewer } from "../../components/json-tree/JsonTreeViewer";
import {
  editorRootToEntityQueryFilter,
  editorRowsToEntityQuerySort,
} from "../../components/entity/entity-query-filter-utils";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  fetchAllEntityItems,
  RELATION_FILTER_OPTIONS_MAX_ITEMS,
} from "../../lib/fetch-all-entity-items";
import { listEntity } from "../../lib/api-client";
import { useEntityQueryBuilder } from "./entity-query-builder-context";

export function EntityQueryPreviewPanel() {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const { editor } = useEntityQueryBuilder();
  const [expanded, setExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<
    readonly Record<string, unknown>[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;

  async function handleRunQuery() {
    if (!definition || !draft) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const filterRoot = editorRootToEntityQueryFilter(draft.filter);
      const sort = editorRowsToEntityQuerySort(draft.sort);

      const expanded = await expandRelationFiltersInTree({
        sourceEntity: definition.sourceEntity,
        catalog: entities,
        filter: filterRoot,
        listChildRecords: async (entityName, query) => {
          return fetchAllEntityItems<Record<string, unknown>>(entityName, {
            maxItems: ENTITY_QUERY_RELATION_LIST_MAX_ITEMS,
            query: { filter: [...query.filter] },
          });
        },
      });

      if (expanded.emptyResult) {
        setResults([]);
        return;
      }

      const queryConfig = buildExpandedQueryConfig(
        {
          filter: filterRoot,
          sort:
            sort.length > 0 &&
            !isRelationSortField(
              definition.sourceEntity,
              entities,
              sort[0]?.field ?? "",
            )
              ? [...sort]
              : [],
          select: draft.select.length > 0 ? [...draft.select] : undefined,
          limitMode: draft.limitMode,
          limit: draft.limitMode === "topN" ? draft.limit : undefined,
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

      if (draft.limitMode === "all") {
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
            catalog: entities,
            items,
            sort,
            listRecords: listChildRecords,
          });
        }
        setResults(items);
        return;
      }

      const page = await listEntity<Record<string, unknown>>(
        definition.sourceEntity,
        {
          limit: draft.limit,
          query: queryConfig,
        },
      );
      let items = page.items;
      if (sort.length > 0) {
        items = await applyRelationSortToItems({
          sourceEntity: definition.sourceEntity,
          catalog: entities,
          items,
          sort,
          listRecords: listChildRecords,
        });
      }
      setResults(items);
    } catch (runError) {
      const message =
        runError instanceof Error
          ? runError.message
          : t("queryBuilder.preview.failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="border-border space-y-3 rounded-md border p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((current) => !current)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
          <Text className="text-sm font-medium">
            {t("queryBuilder.preview.title")}
          </Text>
        </div>
        <Text className="text-muted-foreground text-xs">
          {t("queryBuilder.preview.hint")}
        </Text>
      </button>

      {expanded ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isRunning}
            disabled={!definition}
            onClick={() => void handleRunQuery()}
          >
            {t("queryBuilder.preview.run")}
          </Button>

          {error ? (
            <Text className="text-destructive text-sm">{error}</Text>
          ) : null}

          {results ? (
            <div className="space-y-2">
              <Text className="text-muted-foreground text-sm">
                {t("queryBuilder.preview.resultCount", {
                  count: results.length,
                })}
              </Text>
              <JsonTreeViewer value={results} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
