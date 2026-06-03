import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EntityUiOverrideRecord,
  UiLayoutDocument,
  ViewConfig,
} from "@repo/entities";
import {
  createDefaultFormLayout,
  createDefaultMainPageLayout,
  createDefaultUiLayout,
  normalizeEntityViews,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

type UiOverrideSlice =
  | "listItem"
  | "mainPage"
  | "recordDetail"
  | "forms.create"
  | "forms.edit";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

function readSliceLayout(
  definition: ReturnType<typeof useEntityDefinition>,
  slice: UiOverrideSlice,
): UiLayoutDocument | undefined {
  switch (slice) {
    case "listItem":
      return (
        definition.ui.listItem ??
        definition.ui.views.find((v) => v.type === "card")?.layout
      );
    case "mainPage":
      return definition.ui.mainPageLayout;
    case "recordDetail":
      return definition.ui.recordDetailLayout ?? definition.ui.detailLayout;
    case "forms.create":
      return definition.ui.forms.create.layout;
    case "forms.edit":
      return definition.ui.forms.edit.layout;
  }
}

function createDefaultLayoutForSlice(
  slice: UiOverrideSlice,
  fieldPaths: readonly string[],
): UiLayoutDocument {
  switch (slice) {
    case "mainPage":
      return createDefaultMainPageLayout();
    case "forms.create":
    case "forms.edit":
      return createDefaultFormLayout(fieldPaths);
    case "recordDetail":
      return createDefaultUiLayout(fieldPaths);
    case "listItem":
      return createDefaultUiLayout(fieldPaths);
  }
}

function preserveViews(
  definition: ReturnType<typeof useEntityDefinition>,
): readonly ViewConfig[] {
  return [...definition.ui.views];
}

export function useEntityUiOverrideEditor(
  entityName: EntityName,
  slice: UiOverrideSlice,
) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );

  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultLayoutForSlice(slice, fieldPaths),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const defaultFieldPath = fieldPaths[0] ?? "name";

  useEffect(() => {
    const existing = readSliceLayout(definition, slice);
    if (existing) {
      setLayout(existing);
      setLayoutEditorKey((current) => current + 1);
      return;
    }
    setLayout(createDefaultLayoutForSlice(slice, fieldPaths));
    setLayoutEditorKey((current) => current + 1);
  }, [definition, fieldPaths, slice]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const views = preserveViews(definition);
      const basePayload = {
        views: normalizeEntityViews(views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
      };

      let override: EntityUiOverrideRecord;
      if (slice === "listItem") {
        const cardView = views.find((v) => v.type === "card");
        const nextViews = cardView
          ? views.map((view) =>
              view.type === "card"
                ? { ...view, layout, fields: fieldPaths }
                : view,
            )
          : [
              ...views,
              {
                type: "card" as const,
                name: "card",
                fields: fieldPaths,
                layout,
              },
            ];
        ({ override } = await putEntityUiOverride(entityName, {
          ...basePayload,
          views: normalizeEntityViews(nextViews),
          listItem: layout,
        }));
      } else if (slice === "mainPage") {
        ({ override } = await putEntityUiOverride(entityName, {
          ...basePayload,
          mainPage: layout,
        }));
      } else if (slice === "recordDetail") {
        ({ override } = await putEntityUiOverride(entityName, {
          ...basePayload,
          recordDetail: layout,
        }));
      } else if (slice === "forms.create") {
        ({ override } = await putEntityUiOverride(entityName, {
          ...basePayload,
          forms: { create: layout },
        }));
      } else {
        ({ override } = await putEntityUiOverride(entityName, {
          ...basePayload,
          forms: { edit: layout },
        }));
      }

      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [definition, entityName, fieldPaths, layout, queryClient, slice]);

  return {
    entityName,
    definition,
    fieldPaths,
    defaultFieldPath,
    layout,
    setLayout,
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityUiOverrideEditorResult = ReturnType<
  typeof useEntityUiOverrideEditor
>;
