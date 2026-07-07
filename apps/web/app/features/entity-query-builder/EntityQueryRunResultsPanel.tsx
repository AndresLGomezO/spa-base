import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Text, toast } from "@repo/ui";

import { JsonTreeViewer } from "../../components/json-tree/JsonTreeViewer";
import {
  editorRootToEntityQueryFilter,
  editorRowsToEntityQuerySort,
} from "../../components/entity/entity-query-filter-utils";
import { editorRowsToEntityQueryParameters } from "../../components/entity/entity-query-aggregation-editor-utils";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { executeEntityQueryDefinition } from "../ui-builder/execute-entity-query-definition";
import { useEntityQueryBuilder } from "./entity-query-builder-context";

export function EntityQueryRunResultsPanel() {
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
      const previewDefinition = {
        ...definition,
        filter: editorRootToEntityQueryFilter(draft.filter),
        sort: editorRowsToEntityQuerySort(draft.sort),
        select: draft.select.length > 0 ? [...draft.select] : undefined,
        queryMode: draft.queryMode,
        parameters: editorRowsToEntityQueryParameters(draft.parameters),
        groupBy: [...draft.groupBy],
        aggregations: draft.aggregations.map((entry) => ({ ...entry })),
        groupSort: editorRowsToEntityQuerySort(draft.groupSort),
        groupLimit: draft.groupLimit,
        limitMode: draft.limitMode,
        limit: draft.limitMode === "topN" ? draft.limit : undefined,
        status: draft.status,
        ...(draft.description !== undefined
          ? { description: draft.description }
          : {}),
      };

      const items = await executeEntityQueryDefinition(
        previewDefinition,
        entities,
      );
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
