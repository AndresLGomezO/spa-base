import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import {
  createEmailMatchBinding,
  deleteEmailMatchBinding,
  listEmailMatchBindings,
  patchEmailMatchBinding,
  type EmailMatchBindingRecord,
} from "../../lib/api-client";
import {
  buildDraftFromBinding,
  draftToPatchPayload,
  isDraftDirty,
  type EmailMatchingDraft,
} from "./email-matching-draft";

export function useEmailMatchingEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bindingIdParam = searchParams.get("bindingId") ?? "";

  const [bindings, setBindings] = useState<readonly EmailMatchBindingRecord[]>(
    [],
  );
  const [selectedId, setSelectedIdState] = useState<string>("");
  const [draft, setDraft] = useState<EmailMatchingDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedBinding = useMemo(
    () => bindings.find((entry) => entry.id === selectedId) ?? null,
    [bindings, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selectedBinding || !draft) {
      return false;
    }
    return isDraftDirty(draft, selectedBinding);
  }, [draft, selectedBinding]);

  const setSelectedId = useCallback(
    (id: string) => {
      setSelectedIdState(id);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (id) {
            next.set("bindingId", id);
          } else {
            next.delete("bindingId");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const loadBindings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listEmailMatchBindings();
      const items = [...result.items].sort((left, right) =>
        (left.name ?? left.id).localeCompare(right.name ?? right.id),
      );
      setBindings(items);
      setSelectedIdState((current) => {
        const preferred =
          bindingIdParam && items.some((item) => item.id === bindingIdParam)
            ? bindingIdParam
            : current && items.some((item) => item.id === current)
              ? current
              : (items[0]?.id ?? "");
        return preferred;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load email matching bindings.",
      );
      setBindings([]);
      setSelectedIdState("");
    } finally {
      setIsLoading(false);
    }
  }, [bindingIdParam]);

  useEffect(() => {
    void loadBindings();
  }, [loadBindings]);

  useEffect(() => {
    if (
      bindingIdParam &&
      bindings.some((item) => item.id === bindingIdParam) &&
      selectedId !== bindingIdParam
    ) {
      setSelectedIdState(bindingIdParam);
    }
  }, [bindingIdParam, bindings, selectedId]);

  useEffect(() => {
    if (!selectedBinding) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromBinding(selectedBinding));
  }, [selectedBinding]);

  const updateDraft = useCallback((patch: Partial<EmailMatchingDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedBinding = useCallback(async (): Promise<string | null> => {
    if (!selectedBinding || !draft) {
      return null;
    }

    setIsSaving(true);
    try {
      const updated = await patchEmailMatchBinding(
        selectedBinding.id,
        draftToPatchPayload(draft),
      );
      setBindings((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromBinding(updated));
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save email matching binding.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedBinding]);

  const createBinding = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
      readonly entityName: string;
      readonly recordId: string;
    }): Promise<EmailMatchBindingRecord | string> => {
      try {
        const created = await createEmailMatchBinding({
          entityName: input.entityName,
          recordId: input.recordId,
          name: input.name,
          ...(input.description ? { description: input.description } : {}),
          enabled: true,
          order: 100,
          ingestMode: "create",
          fromAddresses: [],
          subjectPatterns: [],
          bodyPatterns: [],
          useAi: false,
          bodyFieldExtractors: [],
        });
        setBindings((current) =>
          [...current, created].sort((left, right) =>
            (left.name ?? left.id).localeCompare(right.name ?? right.id),
          ),
        );
        setSelectedId(created.id);
        return created;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create email matching binding.";
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
        const updated = await patchEmailMatchBinding(id, {
          name: input.name,
          description:
            input.description !== undefined
              ? input.description || null
              : undefined,
        });
        setBindings((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        if (selectedId === id) {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  name: updated.name ?? "",
                  description: updated.description ?? "",
                }
              : current,
          );
        }
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to update binding metadata.";
      }
    },
    [selectedId],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean): Promise<string | null> => {
      try {
        const updated = await patchEmailMatchBinding(id, { enabled });
        setBindings((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        if (selectedId === id) {
          setDraft((current) =>
            current ? { ...current, enabled: updated.enabled } : current,
          );
        }
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to update binding status.";
      }
    },
    [selectedId],
  );

  const deleteBinding = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        await deleteEmailMatchBinding(id);
        setBindings((current) => {
          const next = current.filter((entry) => entry.id !== id);
          const nextSelected =
            selectedId === id ? (next[0]?.id ?? "") : selectedId;
          if (nextSelected !== selectedId) {
            setSelectedId(nextSelected);
          }
          return next;
        });
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to delete email matching binding.";
      }
    },
    [selectedId, setSelectedId],
  );

  const applyImportedDraft = useCallback((imported: EmailMatchingDraft) => {
    setDraft(imported);
  }, []);

  return {
    bindings,
    selectedId,
    setSelectedId,
    selectedBinding,
    draft,
    updateDraft,
    applyImportedDraft,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    reloadBindings: loadBindings,
    saveSelectedBinding,
    createBinding,
    updateMetadata,
    setEnabled,
    deleteBinding,
  };
}
