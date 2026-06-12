import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DesignLayoutSliceData,
  RecordDetailSliceData,
  UiLayoutDocument,
} from "@repo/entities";
import { createDefaultUiLayout, normalizeEntityViews } from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { ensureRecordDetailNestedLayoutRoot } from "./ensure-record-detail-nested-layout-root";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

export function useEntityRecordDetailLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const uiViews = definition.ui.views;
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );
  const defaultFieldPath = fieldPaths[0] ?? "name";

  const [layout, setLayout] = useState<UiLayoutDocument>(() => {
    const existing =
      definition.ui.recordDetailLayout ?? definition.ui.detailLayout;
    const source = existing ?? createDefaultUiLayout(fieldPaths);
    return ensureRecordDetailNestedLayoutRoot(source);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [layoutSyncGeneration, setLayoutSyncGeneration] = useState(0);

  useEffect(() => {
    const existing =
      definition.ui.recordDetailLayout ?? definition.ui.detailLayout;
    const source = existing ?? createDefaultUiLayout(fieldPaths);
    setLayout(ensureRecordDetailNestedLayoutRoot(source));
    setLayoutSyncGeneration((current) => current + 1);
  }, [
    definition.ui.detailLayout,
    definition.ui.recordDetailLayout,
    fieldPaths,
  ]);

  const setLayoutNormalized = useCallback((next: UiLayoutDocument) => {
    setLayout(ensureRecordDetailNestedLayoutRoot(next));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(uiViews),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        recordDetail: layout,
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [definition.ui.listViewType, entityName, layout, queryClient, uiViews]);

  const exportSlice = useCallback((): RecordDetailSliceData => {
    return { recordDetail: layout };
  }, [layout]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    setLayout(
      ensureRecordDetailNestedLayoutRoot(
        (data as RecordDetailSliceData).recordDetail,
      ),
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
    defaultFieldPath,
    fieldPaths,
    layoutSyncGeneration,
  };
}

export type UseEntityRecordDetailLayoutEditorResult = ReturnType<
  typeof useEntityRecordDetailLayoutEditor
>;
