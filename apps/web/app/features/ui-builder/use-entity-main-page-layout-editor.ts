import { useCallback, useEffect, useState } from "react";
import type { UiLayoutDocument } from "@repo/entities";
import {
  createDefaultMainPageLayout,
  normalizeEntityViews,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

export function useEntityMainPageLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;

  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultMainPageLayout(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  useEffect(() => {
    const existing = definition.ui.mainPageLayout;
    if (existing) {
      setLayout(existing);
      setLayoutEditorKey((current) => current + 1);
      return;
    }
    setLayout(createDefaultMainPageLayout());
    setLayoutEditorKey((current) => current + 1);
  }, [definition.ui.mainPageLayout]);

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

  return {
    entityName,
    definition,
    layout,
    setLayout,
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityMainPageLayoutEditorResult = ReturnType<
  typeof useEntityMainPageLayoutEditor
>;
