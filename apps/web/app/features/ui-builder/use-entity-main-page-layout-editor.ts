import { useCallback, useEffect, useState } from "react";
import type {
  DesignLayoutSliceData,
  MainPageSliceData,
  UiLayoutDocument,
} from "@repo/entities";
import {
  createDefaultMainPageLayout,
  normalizeEntityViews,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { ensureMainPageNestedLayoutRoot } from "./ensure-main-page-nested-layout-root";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

export function useEntityMainPageLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    ensureMainPageNestedLayoutRoot(createDefaultMainPageLayout()),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = definition.ui.mainPageLayout;
    const source = existing ?? createDefaultMainPageLayout();
    setLayout(ensureMainPageNestedLayoutRoot(source));
  }, [definition.ui.mainPageLayout]);

  const setLayoutNormalized = useCallback((next: UiLayoutDocument) => {
    setLayout(ensureMainPageNestedLayoutRoot(next));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(uiViews),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        mainPage: layout,
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [definition.ui.listViewType, entityName, layout, queryClient, uiViews]);

  const exportSlice = useCallback((): MainPageSliceData => {
    return { mainPage: layout };
  }, [layout]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    setLayout(
      ensureMainPageNestedLayoutRoot((data as MainPageSliceData).mainPage),
    );
  }, []);

  return {
    entityName,
    definition,
    layout,
    setLayout: setLayoutNormalized,
    isSaving,
    save,
    exportSlice,
    applySlice,
  };
}

export type UseEntityMainPageLayoutEditorResult = ReturnType<
  typeof useEntityMainPageLayoutEditor
>;
