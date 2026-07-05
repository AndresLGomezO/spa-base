import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolvePreviewStrategy,
  toEditableLayoutDocument,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { createEntityRecordRenderContext } from "../ui-builder/create-entity-record-render-context";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { DetailViewDesignerPreviewThemeSelect } from "./DetailViewDesignerPreviewThemeSelect";
import { useDetailViewDesignerLayoutPreviewWrappers } from "./use-detail-view-designer-layout-preview-wrappers";

interface DetailViewDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DetailViewDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: DetailViewDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { editor, previewColorScheme } = useDetailViewDesigner();
  const { getDefinition } = useEntityCatalog();
  const { items } = useEntity(editor.entityName, { page: 1 });

  const structureWrappers =
    useDetailViewDesignerLayoutPreviewWrappers(withStructureChrome);

  const previewRecord = items[0] as Record<string, unknown> | undefined;

  const previewStrategy = useMemo(
    () => resolvePreviewStrategy("recordDetail"),
    [],
  );

  const previewContext = useMemo(() => {
    if (!previewRecord) {
      return null;
    }

    return createEntityRecordRenderContext({
      item: previewRecord,
      definition: editor.definition,
      locale: i18n.language,
      usePreviewSamples: true,
      getDefinition,
    });
  }, [editor.definition, getDefinition, i18n.language, previewRecord]);

  const editableLayout = useMemo(
    () => toEditableLayoutDocument(editor.layout),
    [editor.layout],
  );

  const previewBody =
    previewContext != null ? (
      <RecursiveLayoutRenderer
        layout={editableLayout}
        context={previewContext}
        rowWrapper={structureWrappers?.rowWrapper}
        rootColumnWrapper={structureWrappers?.rootColumnWrapper}
        nestedColumnWrapper={structureWrappers?.nestedColumnWrapper}
      />
    ) : (
      <Text className="text-muted-foreground text-sm">
        {t("detailViewDesigner.previewNoRecords")}
      </Text>
    );

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={withStructureChrome}
      colorScheme={previewColorScheme}
      themeControls={<DetailViewDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
