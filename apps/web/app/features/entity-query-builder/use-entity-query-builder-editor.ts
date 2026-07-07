import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import {
  createEntityQueryDefinition,
  deleteEntityQueryDefinition,
  isApiClientError,
  listEntityQueryDefinitions,
  patchEntityQueryDefinition,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import {
  editorRowsToEntityQuerySort,
  entityQueryFilterRootToEditor,
  entityQuerySortToEditorRows,
  normalizeEditorFilterForComparison,
  type EntityQueryFilterEditorGroup,
  type EntityQuerySortEditorRow,
} from "../../components/entity/entity-query-filter-utils";
import {
  editorRowsToEntityQueryAggregations,
  editorRowsToEntityQueryParameters,
  entityQueryAggregationsToEditorRows,
  entityQueryParametersToEditorRows,
  createEmptyEntityQueryAggregationRow,
  type EntityQueryAggregationEditorRow,
  type EntityQueryParameterEditorRow,
} from "../../components/entity/entity-query-aggregation-editor-utils";
import { validateEntityQueryFormState } from "./json/export-entity-query-form-state";

interface EntityQueryDraftState {
  readonly description?: string;
  readonly queryMode: NonNullable<EntityQueryDefinitionRecord["queryMode"]>;
  readonly parameters: readonly EntityQueryParameterEditorRow[];
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
  readonly groupBy: readonly string[];
  readonly aggregations: readonly EntityQueryAggregationEditorRow[];
  readonly groupSort: readonly EntityQuerySortEditorRow[];
  readonly groupLimit?: number;
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number;
  readonly status: EntityQueryDefinitionRecord["status"];
}

function buildDraftFromDefinition(
  definition: EntityQueryDefinitionRecord,
): EntityQueryDraftState {
  return {
    description: definition.description,
    queryMode: definition.queryMode ?? "records",
    parameters: entityQueryParametersToEditorRows(definition.parameters ?? []),
    filter: entityQueryFilterRootToEditor(
      definition.filter,
      definition.parameters,
    ),
    sort: entityQuerySortToEditorRows(definition.sort),
    select: definition.select ? [...definition.select] : [],
    groupBy: definition.groupBy ? [...definition.groupBy] : [],
    aggregations: entityQueryAggregationsToEditorRows(
      definition.aggregations ?? [],
    ),
    groupSort: entityQuerySortToEditorRows(definition.groupSort ?? []),
    groupLimit: definition.groupLimit,
    limitMode: definition.limitMode,
    limit: definition.limit ?? 20,
    status: definition.status,
  };
}

interface ComparableQuerySettings {
  readonly description?: string;
  readonly queryMode: NonNullable<EntityQueryDefinitionRecord["queryMode"]>;
  readonly parameters: EntityQueryDefinitionRecord["parameters"];
  readonly filter: EntityQueryDefinitionRecord["filter"];
  readonly sort: EntityQueryDefinitionRecord["sort"];
  readonly select: readonly string[] | undefined;
  readonly groupBy: readonly string[] | undefined;
  readonly aggregations: EntityQueryDefinitionRecord["aggregations"];
  readonly groupSort: EntityQueryDefinitionRecord["groupSort"];
  readonly groupLimit: number | undefined;
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number | undefined;
  readonly status: EntityQueryDefinitionRecord["status"];
}

function normalizeDraftForComparison(
  draft: EntityQueryDraftState,
): ComparableQuerySettings {
  return {
    description: draft.description,
    queryMode: draft.queryMode,
    parameters: editorRowsToEntityQueryParameters(draft.parameters),
    filter: normalizeEditorFilterForComparison(draft.filter),
    sort: editorRowsToEntityQuerySort(draft.sort),
    select: draft.select.length > 0 ? [...draft.select] : undefined,
    groupBy: draft.groupBy.length > 0 ? [...draft.groupBy] : undefined,
    aggregations: editorRowsToEntityQueryAggregations(draft.aggregations),
    groupSort: editorRowsToEntityQuerySort(draft.groupSort),
    groupLimit: draft.groupLimit,
    limitMode: draft.limitMode,
    limit: draft.limitMode === "topN" ? draft.limit : undefined,
    status: draft.status,
  };
}

function normalizeDefinitionForComparison(
  definition: EntityQueryDefinitionRecord,
): ComparableQuerySettings {
  return {
    description: definition.description,
    queryMode: definition.queryMode ?? "records",
    parameters: definition.parameters,
    filter: definition.filter,
    sort: definition.sort,
    select:
      definition.select && definition.select.length > 0
        ? [...definition.select]
        : undefined,
    groupBy:
      definition.groupBy && definition.groupBy.length > 0
        ? [...definition.groupBy]
        : undefined,
    aggregations: definition.aggregations,
    groupSort: definition.groupSort,
    groupLimit: definition.groupLimit,
    limitMode: definition.limitMode,
    limit: definition.limitMode === "topN" ? definition.limit : undefined,
    status: definition.status,
  };
}

function isDraftDirty(
  draft: EntityQueryDraftState,
  definition: EntityQueryDefinitionRecord,
): boolean {
  return (
    JSON.stringify(normalizeDraftForComparison(draft)) !==
    JSON.stringify(normalizeDefinitionForComparison(definition))
  );
}

export const ENTITY_QUERY_SELECTION_SEARCH_PARAM = "query";

export function getEntityQuerySelectionId(
  searchParams: URLSearchParams,
): string {
  return searchParams.get(ENTITY_QUERY_SELECTION_SEARCH_PARAM)?.trim() ?? "";
}

export function applyEntityQuerySelectionToSearchParams(
  searchParams: URLSearchParams,
  queryId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = queryId.trim();
  if (trimmed.length === 0) {
    next.delete(ENTITY_QUERY_SELECTION_SEARCH_PARAM);
  } else {
    next.set(ENTITY_QUERY_SELECTION_SEARCH_PARAM, trimmed);
  }
  return next;
}

export function useEntityQueryBuilderEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [definitions, setDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);
  const [draft, setDraft] = useState<EntityQueryDraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = getEntityQuerySelectionId(searchParams);

  const setSelectedId = useCallback(
    (queryId: string) => {
      const next = applyEntityQuerySelectionToSearchParams(
        searchParams,
        queryId,
      );
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams],
  );

  const selectedDefinition = useMemo(
    () => definitions.find((entry) => entry.id === selectedId) ?? null,
    [definitions, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selectedDefinition || !draft) {
      return false;
    }
    return isDraftDirty(draft, selectedDefinition);
  }, [draft, selectedDefinition]);

  const loadDefinitions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listEntityQueryDefinitions();
      const items = [...result.items].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      setDefinitions(items);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load queries.",
      );
      setDefinitions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (definitions.length === 0) {
      if (selectedId.length > 0) {
        const next = applyEntityQuerySelectionToSearchParams(searchParams, "");
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const hasValidSelection = definitions.some(
      (definition) => definition.id === selectedId,
    );
    if (hasValidSelection) {
      return;
    }

    const fallbackId = definitions[0]?.id ?? "";
    const next = applyEntityQuerySelectionToSearchParams(
      searchParams,
      fallbackId,
    );
    setSearchParams(next, { replace: true });
  }, [definitions, isLoading, searchParams, selectedId, setSearchParams]);

  useEffect(() => {
    if (!selectedDefinition) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromDefinition(selectedDefinition));
  }, [selectedDefinition]);

  const updateDraft = useCallback((patch: Partial<EntityQueryDraftState>) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, ...patch };

      if (patch.queryMode === "aggregated") {
        return {
          ...next,
          limitMode: "all",
          sort: [],
          aggregations:
            next.aggregations.length > 0
              ? next.aggregations
              : [createEmptyEntityQueryAggregationRow()],
        };
      }

      if (patch.queryMode === "records") {
        return {
          ...next,
          groupBy: [],
          aggregations: [],
          groupSort: [],
          groupLimit: undefined,
        };
      }

      return next;
    });
  }, []);

  const saveSelectedQuery = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) {
      return null;
    }

    setIsSaving(true);
    try {
      const validation = validateEntityQueryFormState({
        name: selectedDefinition.name,
        description: draft.description,
        sourceEntity: selectedDefinition.sourceEntity,
        queryMode: draft.queryMode,
        parameters: draft.parameters,
        filter: draft.filter,
        sort: draft.sort,
        select: draft.select,
        groupBy: draft.groupBy,
        aggregations: draft.aggregations,
        groupSort: draft.groupSort,
        groupLimit: draft.groupLimit,
        limitMode: draft.limitMode,
        limit: draft.limit,
        status: draft.status,
      });

      if (!validation.ok) {
        return validation.message;
      }

      const validated = validation.data;

      const updated = await patchEntityQueryDefinition(selectedDefinition.id, {
        ...(validated.description !== undefined
          ? { description: validated.description }
          : {}),
        queryMode: validated.queryMode,
        parameters: validated.parameters,
        filter: validated.filter,
        sort: validated.sort,
        select: validated.select,
        groupBy: validated.groupBy,
        aggregations: validated.aggregations,
        groupSort: validated.groupSort,
        ...(validated.groupLimit !== undefined
          ? { groupLimit: validated.groupLimit }
          : {}),
        limitMode: validated.limitMode,
        ...(validated.limitMode === "topN" ? { limit: validated.limit } : {}),
        status: validated.status,
      });
      setDefinitions((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromDefinition(updated));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save query.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedDefinition]);

  const createQuery = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
      readonly sourceEntity: string;
    }): Promise<EntityQueryDefinitionRecord | string> => {
      try {
        const created = await createEntityQueryDefinition({
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          sourceEntity: input.sourceEntity,
          filter: { type: "group", combinator: "and", children: [] },
          sort: [],
          limitMode: "topN",
          limit: 20,
          status: "ACTIVE",
        });
        setDefinitions((current) =>
          [...current, created].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
        setSelectedId(created.id);
        return created;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create query.";
      }
    },
    [setSelectedId],
  );

  const updateMetadata = useCallback(
    async (
      id: string,
      input: { readonly name: string; readonly description?: string },
    ): Promise<string | null> => {
      try {
        const updated = await patchEntityQueryDefinition(id, {
          name: input.name,
          description: input.description,
        });
        setDefinitions((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to update query.";
      }
    },
    [],
  );

  const deleteQuery = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        await deleteEntityQueryDefinition(id);
        setDefinitions((current) => current.filter((entry) => entry.id !== id));
        return null;
      } catch (error) {
        return isApiClientError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete query.";
      }
    },
    [],
  );

  return {
    definitions,
    selectedId,
    selectedDefinition,
    draft,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    setSelectedId,
    updateDraft,
    saveSelectedQuery,
    createQuery,
    updateMetadata,
    deleteQuery,
    reloadDefinitions: loadDefinitions,
  };
}

export type { EntityQueryDraftState };
