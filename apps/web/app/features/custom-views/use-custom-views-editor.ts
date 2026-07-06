import { slugCustomViewId } from "@repo/custom-views/browser";
import type { CustomViewUIConfig } from "@repo/custom-views/browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useCustomViewCatalog } from "../../custom-views/custom-view-catalog-context";
import { toApiCustomViewUiPatch } from "../../custom-views/normalize-custom-view-ui";
import {
  createCustomView,
  deleteCustomView,
  patchCustomView,
  type CustomViewRecord,
} from "../../lib/api-client";
import {
  buildCustomViewPayloadFromForm,
  customViewFormFromRecord,
  isCustomViewFormDirty,
  type CustomViewFormState,
} from "./custom-view-form-state";
import {
  resolveQueryIdByName,
  type CustomViewFormStateImportResult,
} from "./json/export-custom-view-form-state";

const CUSTOM_VIEW_SELECTION_SEARCH_PARAM = "view";

export function getCustomViewSelectionId(
  searchParams: URLSearchParams,
): string {
  return searchParams.get(CUSTOM_VIEW_SELECTION_SEARCH_PARAM)?.trim() ?? "";
}

export function applyCustomViewSelectionToSearchParams(
  searchParams: URLSearchParams,
  viewId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = viewId.trim();
  if (trimmed.length === 0) {
    next.delete(CUSTOM_VIEW_SELECTION_SEARCH_PARAM);
  } else {
    next.set(CUSTOM_VIEW_SELECTION_SEARCH_PARAM, trimmed);
  }
  return next;
}

interface CreateCustomViewInput {
  readonly name: string;
  readonly entityQueryDefinitionId: string;
}

export function useCustomViewsEditor() {
  const {
    items: views,
    refresh,
    isLoading,
    error: loadError,
  } = useCustomViewCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<CustomViewFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [importedUi, setImportedUi] = useState<CustomViewUIConfig | undefined>(
    undefined,
  );

  const selectedId = getCustomViewSelectionId(searchParams);

  const setSelectedId = useCallback(
    (viewId: string) => {
      const next = applyCustomViewSelectionToSearchParams(searchParams, viewId);
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams],
  );

  const sortedViews = useMemo(
    () => [...views].sort((left, right) => left.name.localeCompare(right.name)),
    [views],
  );

  const selectedView = useMemo(
    () => sortedViews.find((entry) => entry.id === selectedId) ?? null,
    [selectedId, sortedViews],
  );

  const isDirty = useMemo(() => {
    if (!selectedView || !draft) {
      return false;
    }
    return isCustomViewFormDirty(draft, selectedView);
  }, [draft, selectedView]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (sortedViews.length === 0) {
      if (selectedId.length > 0) {
        const next = applyCustomViewSelectionToSearchParams(searchParams, "");
        if (next.toString() !== searchParams.toString()) {
          setSearchParams(next, { replace: true });
        }
      }
      return;
    }

    const hasValidSelection = sortedViews.some(
      (view) => view.id === selectedId,
    );
    if (hasValidSelection) {
      return;
    }

    const fallbackId = sortedViews[0]?.id ?? "";
    const next = applyCustomViewSelectionToSearchParams(
      searchParams,
      fallbackId,
    );
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [isLoading, searchParams, selectedId, setSearchParams, sortedViews]);

  useEffect(() => {
    if (!selectedView) {
      setDraft(null);
      setImportedUi(undefined);
      return;
    }
    setDraft(customViewFormFromRecord(selectedView));
    setImportedUi(undefined);
  }, [selectedView]);

  const updateDraft = useCallback((patch: Partial<CustomViewFormState>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedView = useCallback(async (): Promise<string | null> => {
    if (!selectedView || !draft) {
      return null;
    }

    setIsSaving(true);
    try {
      await patchCustomView(
        selectedView.id,
        buildCustomViewPayloadFromForm(draft),
      );
      await refresh();
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save sidebar query.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, refresh, selectedView]);

  const createView = useCallback(
    async (
      input: CreateCustomViewInput,
    ): Promise<CustomViewRecord | string> => {
      try {
        const name = input.name.trim();
        const created = await createCustomView({
          name,
          entityQueryDefinitionId: input.entityQueryDefinitionId,
          viewId: slugCustomViewId(name),
          status: "ACTIVE",
          nav: { label: name },
        });
        await refresh();
        setSelectedId(created.id);
        return created;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create sidebar query.";
      }
    },
    [refresh, setSelectedId],
  );

  const deleteView = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        await deleteCustomView(id);
        await refresh();
        if (selectedId === id) {
          const remaining = sortedViews.filter((view) => view.id !== id);
          setSelectedId(remaining[0]?.id ?? "");
        }
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to delete sidebar query.";
      }
    },
    [refresh, selectedId, setSelectedId, sortedViews],
  );

  const applyJsonImport = useCallback(
    async (
      imported: CustomViewFormStateImportResult,
      queries: readonly { readonly id: string; readonly name: string }[],
    ): Promise<string | null> => {
      if (!selectedView) {
        return null;
      }

      const queryId = resolveQueryIdByName(
        queries,
        imported.entityQueryDefinitionName,
      );
      if (!queryId) {
        return "queryNotFound";
      }

      const navOrder =
        imported.navOrder.trim().length > 0
          ? Number(imported.navOrder)
          : undefined;

      try {
        await patchCustomView(selectedView.id, {
          name: imported.name,
          ...(imported.description.trim()
            ? { description: imported.description.trim() }
            : {}),
          entityQueryDefinitionId: queryId,
          status: imported.status,
          hiddenFromNav: imported.hiddenFromNav,
          ...(imported.navCategoryId.trim()
            ? { navCategoryId: imported.navCategoryId.trim() }
            : {}),
          ...(navOrder !== undefined && !Number.isNaN(navOrder)
            ? { navOrder }
            : {}),
          nav: {
            label: imported.navLabel.trim() || imported.name.trim(),
            ...(imported.navIcon.trim()
              ? { icon: imported.navIcon.trim() }
              : {}),
          },
          ...(imported.ui !== undefined
            ? { ui: toApiCustomViewUiPatch(imported.ui) }
            : {}),
        });
        await refresh();
        setDraft({
          name: imported.name,
          description: imported.description,
          entityQueryDefinitionId: queryId,
          navLabel: imported.navLabel,
          navIcon: imported.navIcon,
          navCategoryId: imported.navCategoryId,
          navOrder: imported.navOrder,
          hiddenFromNav: imported.hiddenFromNav,
          status: imported.status,
        });
        if (imported.ui !== undefined) {
          setImportedUi(imported.ui);
        }
        return null;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to apply imported JSON.";
      }
    },
    [refresh, selectedView],
  );

  return {
    views: sortedViews,
    selectedId,
    setSelectedId,
    selectedView,
    draft,
    updateDraft,
    importedUi,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    refresh,
    saveSelectedView,
    createView,
    deleteView,
    applyJsonImport,
  };
}
