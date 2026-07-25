import { useCallback, useEffect, useMemo, useState } from "react";

import type { AiContextSectionBlock } from "@repo/ai-context/storage";
import {
  createAiContextSection,
  deleteAiContextSection,
  listAiContextSections,
  updateAiContextSection,
  type AiContextSectionRecord,
  type AiContextSectionScope,
} from "../../lib/api-client";

interface UserAiContextDraftState {
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly scope: AiContextSectionScope;
  readonly order: number;
  readonly blocks: AiContextSectionBlock[];
}

function buildDraftFromDefinition(
  definition: AiContextSectionRecord,
): UserAiContextDraftState {
  return {
    name: definition.name,
    description: definition.description ?? "",
    enabled: definition.enabled,
    scope: definition.scope,
    order: definition.order,
    blocks: [...definition.blocks],
  };
}

function isDraftDirty(
  draft: UserAiContextDraftState,
  definition: AiContextSectionRecord,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(buildDraftFromDefinition(definition))
  );
}

export function useUserAiContextEditor() {
  const [definitions, setDefinitions] = useState<
    readonly AiContextSectionRecord[]
  >([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<UserAiContextDraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedDefinition = useMemo(
    () => definitions.find((entry) => entry.id === selectedId) ?? null,
    [definitions, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selectedDefinition || !draft) return false;
    return isDraftDirty(draft, selectedDefinition);
  }, [draft, selectedDefinition]);

  const loadDefinitions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listAiContextSections();
      const items = [...result.items].sort(
        (left, right) =>
          left.order - right.order || left.name.localeCompare(right.name),
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
        error instanceof Error
          ? error.message
          : "Failed to load AI context sections.",
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

  const updateDraft = useCallback((patch: Partial<UserAiContextDraftState>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelected = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) return null;
    setIsSaving(true);
    try {
      const updated = await updateAiContextSection(selectedDefinition.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        enabled: draft.enabled,
        scope: draft.scope,
        order: draft.order,
        blocks: draft.blocks,
      });
      setDefinitions((current) =>
        current
          .map((entry) => (entry.id === updated.id ? updated : entry))
          .sort(
            (left, right) =>
              left.order - right.order || left.name.localeCompare(right.name),
          ),
      );
      setDraft(buildDraftFromDefinition(updated));
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save AI context section.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedDefinition]);

  const createSection = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
    }): Promise<AiContextSectionRecord | string> => {
      try {
        const created = await createAiContextSection({
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          enabled: true,
          scope: "perUser",
          blocks: [],
        });
        setDefinitions((current) =>
          [...current, created].sort(
            (left, right) =>
              left.order - right.order || left.name.localeCompare(right.name),
          ),
        );
        setSelectedId(created.id);
        return created;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create AI context section.";
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
        const updated = await updateAiContextSection(id, {
          name: input.name,
          description: input.description?.trim() ? input.description : null,
        });
        setDefinitions((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        if (selectedId === id) {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  name: updated.name,
                  description: updated.description ?? "",
                }
              : current,
          );
        }
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to update metadata.";
      }
    },
    [selectedId],
  );

  const deleteSection = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        await deleteAiContextSection(id);
        setDefinitions((current) => {
          const next = current.filter((entry) => entry.id !== id);
          setSelectedId((selected) => {
            if (selected !== id) return selected;
            return next[0]?.id ?? "";
          });
          return next;
        });
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to delete AI context section.";
      }
    },
    [],
  );

  return {
    definitions,
    selectedId,
    setSelectedId,
    selectedDefinition,
    draft,
    updateDraft,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    reloadDefinitions: loadDefinitions,
    saveSelected,
    createSection,
    updateMetadata,
    deleteSection,
  };
}
