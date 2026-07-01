import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DesignLayoutSliceData,
  MainPageSliceData,
  UiLayoutDocument,
  ViewConfig,
} from "@repo/entities";
import {
  createDefaultMainPageLayout,
  normalizeEntityViews,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import { buildCustomViewUiPatch } from "../../custom-views/build-custom-view-ui-patch";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { patchCustomView } from "../../lib/api-client";
import { ensureContainerRoot } from "@repo/ui-builder-core";
import { useCustomViewLayoutEditorContext } from "./resolve-custom-view-layout-editor-context";

const EMPTY_VIEWS: readonly ViewConfig[] = [];

export function useCustomViewMainPageLayoutEditor(viewId?: string) {
  const queryClient = useQueryClient();
  const { customView, entityName, definition } =
    useCustomViewLayoutEditorContext(viewId);
  const uiViews = useMemo(
    () => definition?.ui.views ?? EMPTY_VIEWS,
    [definition?.ui.views],
  );

  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    ensureContainerRoot(createDefaultMainPageLayout()),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!definition) {
      return;
    }
    const existing = definition.ui.mainPageLayout;
    const source = existing ?? createDefaultMainPageLayout();
    setLayout(ensureContainerRoot(source));
  }, [definition]);

  const setLayoutNormalized = useCallback((next: UiLayoutDocument) => {
    setLayout(ensureContainerRoot(next));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!customView || !definition) {
      return false;
    }
    setIsSaving(true);
    try {
      await patchCustomView(
        customView.id,
        buildCustomViewUiPatch({
          views: [...normalizeEntityViews(uiViews)],
          ...(definition.ui.listViewType
            ? { listViewType: definition.ui.listViewType }
            : {}),
          mainPageLayout: layout,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["custom-views"] });
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [customView, definition, layout, queryClient, uiViews]);

  const exportSlice = useCallback((): MainPageSliceData => {
    return { mainPage: layout };
  }, [layout]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    setLayout(ensureContainerRoot((data as MainPageSliceData).mainPage));
  }, []);

  return {
    entityName,
    definition: definition as EntityCatalogEntry,
    layout,
    setLayout: setLayoutNormalized,
    isSaving,
    save,
    exportSlice,
    applySlice,
  };
}
