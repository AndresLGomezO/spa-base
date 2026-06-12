import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import { createEntityRecordRenderContext } from "../ui-builder/create-entity-record-render-context";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerPreviewThemeScope } from "../form-designer/FormDesignerPreviewThemeScope";
import { MobileDevicePreviewFrame } from "../form-designer/MobileDevicePreviewFrame";
import { resolveMobilePreviewDevice } from "../form-designer/mobile-preview-device-presets";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { DetailViewDesignerMobileDeviceSelect } from "./DetailViewDesignerMobileDeviceSelect";
import { DetailViewDesignerPreviewThemeSelect } from "./DetailViewDesignerPreviewThemeSelect";
import { useDetailViewDesignerLayoutPreviewWrappers } from "./use-detail-view-designer-layout-preview-wrappers";

interface DetailViewDesignerPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DetailViewDesignerPreviewPanel({
  withStructureChrome = false,
}: DetailViewDesignerPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const {
    editor,
    previewBreakpoint,
    previewMobileDeviceId,
    previewColorScheme,
  } = useDetailViewDesigner();
  const { getDefinition } = useEntityCatalog();
  const { items } = useEntity(editor.entityName, { page: 1 });

  const structureWrappers =
    useDetailViewDesignerLayoutPreviewWrappers(withStructureChrome);

  const previewRecord = items[0] as Record<string, unknown> | undefined;

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

  const mobilePreviewDevice = useMemo(
    () =>
      previewBreakpoint === "base"
        ? resolveMobilePreviewDevice(previewMobileDeviceId)
        : null,
    [previewBreakpoint, previewMobileDeviceId],
  );

  const previewBody =
    previewContext != null ? (
      <RecursiveLayoutRenderer
        layout={editor.layout}
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

  const viewport = mobilePreviewDevice ? (
    <MobileDevicePreviewFrame
      device={mobilePreviewDevice}
      breakpoint={previewBreakpoint}
      className="h-full"
    >
      {previewBody}
    </MobileDevicePreviewFrame>
  ) : (
    <LayoutPreviewViewport breakpoint={previewBreakpoint} className="h-full">
      {previewBody}
    </LayoutPreviewViewport>
  );

  const themedViewport = (
    <FormDesignerPreviewThemeScope colorScheme={previewColorScheme}>
      {viewport}
    </FormDesignerPreviewThemeScope>
  );

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Text className="text-muted-foreground text-sm">
          {t("entity.viewSettings.preview")}
        </Text>
        <div className="flex flex-wrap items-end gap-3">
          <DetailViewDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <DetailViewDesignerMobileDeviceSelect />
          ) : null}
        </div>
      </div>

      <div className="min-h-96 overflow-auto py-2">{themedViewport}</div>
    </div>
  );
}
