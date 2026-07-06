import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createEntityQueryDefinition,
  deleteEntityQueryDefinition,
  isApiClientError,
  listEntityQueryDefinitions,
  patchEntityQueryDefinition,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import {
  editorRootToEntityQueryFilter,
  editorRowsToEntityQuerySort,
  entityQueryFilterRootToEditor,
  entityQuerySortToEditorRows,
  normalizeEditorFilterForComparison,
  type EntityQueryFilterEditorGroup,
  type EntityQuerySortEditorRow,
} from "../../components/entity/entity-query-filter-utils";

interface EntityQueryDraftState {
  readonly description?: string;
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number;
  readonly status: EntityQueryDefinitionRecord["status"];
}

function buildDraftFromDefinition(
  definition: EntityQueryDefinitionRecord,
): EntityQueryDraftState {
  return {
    description: definition.description,
    filter: entityQueryFilterRootToEditor(
      definition.filter,
      definition.parameters,
    ),
    sort: entityQuerySortToEditorRows(definition.sort),
    select: definition.select ? [...definition.select] : [],
    limitMode: definition.limitMode,
    limit: definition.limit ?? 20,
    status: definition.status,
  };
}

interface ComparableQuerySettings {
  readonly description?: string;
  readonly filter: EntityQueryDefinitionRecord["filter"];
  readonly sort: EntityQueryDefinitionRecord["sort"];
  readonly select: readonly string[] | undefined;
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number | undefined;
  readonly status: EntityQueryDefinitionRecord["status"];
}

function normalizeDraftForComparison(
  draft: EntityQueryDraftState,
): ComparableQuerySettings {
  return {
    description: draft.description,
    filter: normalizeEditorFilterForComparison(draft.filter),
    sort: editorRowsToEntityQuerySort(draft.sort),
    select: draft.select.length > 0 ? [...draft.select] : undefined,
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
    filter: definition.filter,
    sort: definition.sort,
    select:
      definition.select && definition.select.length > 0
        ? [...definition.select]
        : undefined,
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

export function useEntityQueryBuilderEditor() {
  const [definitions, setDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<EntityQueryDraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setSelectedId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }
        return items[0]?.id ?? "";
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load queries.",
      );
      setDefinitions([]);
      setSelectedId("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    if (!selectedDefinition) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromDefinition(selectedDefinition));
  }, [selectedDefinition]);

  const updateDraft = useCallback((patch: Partial<EntityQueryDraftState>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedQuery = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) {
      return null;
    }

    setIsSaving(true);
    try {
      const updated = await patchEntityQueryDefinition(selectedDefinition.id, {
        ...(draft.description !== undefined
          ? { description: draft.description }
          : {}),
        filter: editorRootToEntityQueryFilter(draft.filter),
        sort: editorRowsToEntityQuerySort(draft.sort),
        select: draft.select.length > 0 ? draft.select : undefined,
        limitMode: draft.limitMode,
        ...(draft.limitMode === "topN" ? { limit: draft.limit } : {}),
        status: draft.status,
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
    [],
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
        setDefinitions((current) => {
          const next = current.filter((entry) => entry.id !== id);
          setSelectedId((currentSelected) => {
            if (currentSelected !== id) {
              return currentSelected;
            }
            return next[0]?.id ?? "";
          });
          return next;
        });
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
