import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExpressionNode } from "@repo/hooks";

import {
  createFormulaDefinition,
  deleteFormulaDefinition,
  listFormulaDefinitions,
  updateFormulaDefinition,
  type FormulaDefinitionRecord,
} from "../../lib/api-client";

interface FormulaDraftState {
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly body: ExpressionNode;
}

function buildDraftFromDefinition(
  definition: FormulaDefinitionRecord,
): FormulaDraftState {
  return {
    name: definition.name,
    description: definition.description ?? "",
    enabled: definition.enabled,
    body: definition.body,
  };
}

function isDraftDirty(
  draft: FormulaDraftState,
  definition: FormulaDefinitionRecord,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(buildDraftFromDefinition(definition))
  );
}

export function useFormulasEditor() {
  const [definitions, setDefinitions] = useState<
    readonly FormulaDefinitionRecord[]
  >([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<FormulaDraftState | null>(null);
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
    if (selectedDefinition.source === "platform") {
      return false;
    }
    return isDraftDirty(draft, selectedDefinition);
  }, [draft, selectedDefinition]);

  const loadDefinitions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listFormulaDefinitions();
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
        error instanceof Error ? error.message : "Failed to load formulas.",
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

  const updateDraft = useCallback((patch: Partial<FormulaDraftState>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedFormula = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft || selectedDefinition.source === "platform") {
      return null;
    }

    setIsSaving(true);
    try {
      const updated = await updateFormulaDefinition(selectedDefinition.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        body: draft.body,
        enabled: draft.enabled,
      });
      setDefinitions((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromDefinition(updated));
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save formula.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedDefinition]);

  const createFormula = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
    }): Promise<FormulaDefinitionRecord | string> => {
      try {
        const created = await createFormulaDefinition({
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          inputs: [],
          body: { kind: "literal", value: null },
          enabled: true,
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
          : "Failed to create formula.";
      }
    },
    [],
  );

  const updateMetadata = useCallback(
    async (
      id: string,
      input: { readonly name: string; readonly description?: string },
    ): Promise<string | null> => {
      const definition = definitions.find((entry) => entry.id === id);
      if (!definition || definition.source === "platform") {
        return null;
      }

      try {
        const updated = await updateFormulaDefinition(id, {
          name: input.name,
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
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
          : "Failed to update formula metadata.";
      }
    },
    [definitions, selectedId],
  );

  const deleteFormula = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        await deleteFormulaDefinition(id);
        setDefinitions((current) => {
          const next = current.filter((entry) => entry.id !== id);
          setSelectedId((selected) => {
            if (selected !== id) {
              return selected;
            }
            return next[0]?.id ?? "";
          });
          return next;
        });
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to delete formula.";
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
    saveSelectedFormula,
    createFormula,
    updateMetadata,
    deleteFormula,
  };
}
