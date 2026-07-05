import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateUiBuilderPresetInput,
  UiBuilderPresetKind,
} from "@repo/entities";
import type { DesignSurface } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import {
  createUiBuilderPreset,
  deleteUiBuilderPreset,
  listUiBuilderPresets,
  updateUiBuilderPreset,
} from "../../../lib/api-client";
import { buildPresetCatalogEntries } from "./build-preset-catalog-entries";
import type {
  PresetCatalogEntry,
  PresetCatalogEntryId,
} from "./preset-catalog-entry";
import { tenantPresetIdFromEntryId } from "./preset-catalog-entry";

interface TenantPresetDraft {
  readonly name: string;
  readonly description: string;
  readonly kind: UiBuilderPresetKind;
  readonly designSurface: DesignSurface | "";
  readonly templateJson: string;
}

function buildDraftFromPreset(
  entry: PresetCatalogEntry,
): TenantPresetDraft | null {
  const preset = entry.tenantPreset;
  if (!preset) {
    return null;
  }

  return {
    name: preset.name,
    description: preset.description ?? "",
    kind: preset.kind,
    designSurface: preset.designSurface ?? "",
    templateJson: preset.templateJson,
  };
}

function isDraftDirty(
  draft: TenantPresetDraft,
  entry: PresetCatalogEntry,
): boolean {
  const baseline = buildDraftFromPreset(entry);
  if (!baseline) {
    return false;
  }
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}

export function usePresetsEditor() {
  const { t } = useTranslation("common");
  const [tenantPresets, setTenantPresets] = useState<
    Awaited<ReturnType<typeof listUiBuilderPresets>>["items"]
  >([]);
  const [selectedId, setSelectedId] = useState<PresetCatalogEntryId | "">("");
  const [draft, setDraft] = useState<TenantPresetDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const entries = useMemo(
    () => buildPresetCatalogEntries(tenantPresets, t),
    [t, tenantPresets],
  );

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selectedEntry || !draft || selectedEntry.source === "platform") {
      return false;
    }
    return isDraftDirty(draft, selectedEntry);
  }, [draft, selectedEntry]);

  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listUiBuilderPresets();
      setTenantPresets(result.items);
      const merged = buildPresetCatalogEntries(result.items, t);
      setSelectedId((current) => {
        if (current && merged.some((entry) => entry.id === current)) {
          return current;
        }
        return merged[0]?.id ?? "";
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load presets.",
      );
      setTenantPresets([]);
      setSelectedId("");
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    if (!selectedEntry) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromPreset(selectedEntry));
  }, [selectedEntry]);

  const updateDraft = useCallback((patch: Partial<TenantPresetDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedPreset = useCallback(async (): Promise<string | null> => {
    if (!selectedEntry || !draft || selectedEntry.source === "platform") {
      return null;
    }

    const presetId = tenantPresetIdFromEntryId(
      selectedEntry.id as `tenant:${string}`,
    );
    setIsSaving(true);
    try {
      await updateUiBuilderPreset(presetId, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        kind: draft.kind,
        designSurface: draft.designSurface || undefined,
        templateJson: draft.templateJson,
      });
      await loadPresets();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save preset.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, loadPresets, selectedEntry]);

  const createPreset = useCallback(
    async (input: CreateUiBuilderPresetInput): Promise<string | null> => {
      setIsSaving(true);
      try {
        const created = await createUiBuilderPreset(input);
        await loadPresets();
        setSelectedId(`tenant:${created.preset.id}`);
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create preset.";
      } finally {
        setIsSaving(false);
      }
    },
    [loadPresets],
  );

  const deletePreset = useCallback(
    async (entryId: PresetCatalogEntryId): Promise<string | null> => {
      if (!entryId.startsWith("tenant:")) {
        return null;
      }

      setIsSaving(true);
      try {
        await deleteUiBuilderPreset(
          tenantPresetIdFromEntryId(entryId as `tenant:${string}`),
        );
        await loadPresets();
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to delete preset.";
      } finally {
        setIsSaving(false);
      }
    },
    [loadPresets],
  );

  return {
    entries,
    tenantPresets,
    selectedId,
    setSelectedId,
    selectedEntry,
    draft,
    updateDraft,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    reloadPresets: loadPresets,
    saveSelectedPreset,
    createPreset,
    deletePreset,
  };
}
