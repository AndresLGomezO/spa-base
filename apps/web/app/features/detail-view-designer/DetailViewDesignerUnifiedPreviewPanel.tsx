import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { createEntityRecordRenderContext } from "../ui-builder/create-entity-record-render-context";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { useOptionalDetailViewDesignerStructureSession } from "./DetailViewDesignerStructureSession";
import { DetailViewDesignerPreviewThemeSelect } from "./DetailViewDesignerPreviewThemeSelect";

interface DetailViewDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DetailViewDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: DetailViewDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const {
    editor,
    previewColorScheme,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useDetailViewDesigner();
  const structureSession = useOptionalDetailViewDesignerStructureSession();
  const { getDefinition } = useEntityCatalog();
  const { items } = useEntity(editor.entityName, { page: 1 });
  const frameRef = useRef<HTMLDivElement>(null);

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

  const layout = editor.layout;
  const adapters = useLayoutStructureOverlayAdapters({
    enabled: withStructureChrome,
    layout,
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks: false,
  });

  const previewBody =
    previewContext != null ? (
      <LayoutStructureOverlay
        frameRef={frameRef}
        layout={layout}
        enabled={withStructureChrome}
        adapters={adapters}
        className="relative min-h-0 min-w-0 flex-1"
      >
        <RecursiveLayoutRenderer layout={layout} context={previewContext} />
      </LayoutStructureOverlay>
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
