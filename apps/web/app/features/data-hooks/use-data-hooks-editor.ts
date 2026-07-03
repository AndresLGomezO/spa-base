import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DataHookAction,
  DataHookConditionNode,
  DataHookExecutionMode,
  DataHookOperation,
  DataHookPhase,
  DataHookTrigger,
} from "@repo/hooks";

import {
  createDataHook,
  deleteDataHook,
  listDataHooks,
  patchDataHook,
  type DataHookDefinitionRecord,
} from "../../lib/api-client";

interface DataHookDraftState {
  readonly description?: string;
  readonly phase: DataHookPhase;
  readonly trigger: DataHookTrigger;
  readonly condition: DataHookConditionNode | null;
  readonly actions: readonly DataHookAction[];
  readonly enabled: boolean;
  readonly order: number;
  readonly chainHooks: boolean;
  readonly execution: DataHookExecutionMode;
}

function buildDraftFromDefinition(
  definition: DataHookDefinitionRecord,
): DataHookDraftState {
  return {
    ...(definition.description !== undefined
      ? { description: definition.description }
      : {}),
    phase: definition.phase,
    trigger: definition.trigger,
    condition: definition.condition ?? null,
    actions: definition.actions,
    enabled: definition.enabled,
    order: definition.order,
    chainHooks: definition.chainHooks ?? false,
    execution: definition.execution ?? "sync",
  };
}

function isDraftDirty(
  draft: DataHookDraftState,
  definition: DataHookDefinitionRecord,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(buildDraftFromDefinition(definition))
  );
}

function defaultAction(): DataHookAction {
  return { type: "sendNotification", message: { kind: "literal", value: "" } };
}

export function useDataHooksEditor(entityName: string) {
  const [definitions, setDefinitions] = useState<
    readonly DataHookDefinitionRecord[]
  >([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<DataHookDraftState | null>(null);
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
      const result = await listDataHooks({ entity: entityName });
      const items = [...result.items].sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return left.name.localeCompare(right.name);
      });
      setDefinitions(items);
      setSelectedId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }
        return items[0]?.id ?? "";
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load data hooks.",
      );
      setDefinitions([]);
      setSelectedId("");
    } finally {
      setIsLoading(false);
    }
  }, [entityName]);

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

  const updateDraft = useCallback((patch: Partial<DataHookDraftState>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedHook = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) {
      return null;
    }

    setIsSaving(true);
    try {
      const updated = await patchDataHook(selectedDefinition.id, {
        ...(draft.description !== undefined
          ? { description: draft.description || null }
          : {}),
        phase: draft.phase,
        trigger: draft.trigger,
        condition: draft.condition,
        actions: [...draft.actions],
        enabled: draft.enabled,
        order: draft.order,
        chainHooks: draft.chainHooks,
        execution: draft.execution,
      });
      setDefinitions((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromDefinition(updated));
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save data hook.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedDefinition]);

  const createHook = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
      readonly operation: DataHookOperation;
    }): Promise<DataHookDefinitionRecord | string> => {
      try {
        const created = await createDataHook({
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          entity: entityName,
          phase: "after",
          trigger: { kind: "crud", operation: input.operation },
          condition: null,
          actions: [defaultAction()],
          enabled: true,
          order: 0,
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
          : "Failed to create data hook.";
      }
    },
    [entityName],
  );

  const importDefinition = useCallback(
    async (raw: unknown): Promise<DataHookDefinitionRecord | string> => {
      if (!raw || typeof raw !== "object") {
        return "Invalid data hook JSON.";
      }
      const source = raw as Record<string, unknown>;
      try {
        const created = await createDataHook({
          name: String(source.name ?? "Imported hook"),
          ...(typeof source.description === "string"
            ? { description: source.description }
            : {}),
          entity: entityName,
          phase: (source.phase as "before" | "after") ?? "after",
          trigger: (source.trigger as {
            operation: "create" | "update" | "delete";
          }) ?? {
            operation: "create",
          },
          condition: (source.condition as never) ?? null,
          actions: (source.actions as never) ?? [],
          enabled: typeof source.enabled === "boolean" ? source.enabled : true,
          order: typeof source.order === "number" ? source.order : 0,
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
          : "Failed to import data hook.";
      }
    },
    [entityName],
  );

  const updateMetadata = useCallback(
    async (
      id: string,
      input: { readonly name: string; readonly description?: string },
    ): Promise<string | null> => {
      try {
        const updated = await patchDataHook(id, {
          name: input.name,
          description: input.description ?? null,
        });
        setDefinitions((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to update data hook.";
      }
    },
    [],
  );

  const deleteHook = useCallback(async (id: string): Promise<string | null> => {
    try {
      await deleteDataHook(id);
      setDefinitions((current) => {
        const next = current.filter((entry) => entry.id !== id);
        setSelectedId((currentSelected) =>
          currentSelected === id ? (next[0]?.id ?? "") : currentSelected,
        );
        return next;
      });
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to delete data hook.";
    }
  }, []);

  return {
    entityName,
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
    saveSelectedHook,
    createHook,
    importDefinition,
    updateMetadata,
    deleteHook,
    reloadDefinitions: loadDefinitions,
  };
}
