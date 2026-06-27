import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { createEntityLayoutRenderContext } from "../ui-builder/create-entity-layout-render-context";
import { designerPreviewLayoutFillClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DesignerPreviewPanelShell } from "../ui-builder/DesignerPreviewPanelShell";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerPreviewThemeScope } from "../form-designer/FormDesignerPreviewThemeScope";
import { MobileDevicePreviewFrame } from "../form-designer/MobileDevicePreviewFrame";
import { resolveMobilePreviewDevice } from "../form-designer/mobile-preview-device-presets";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerMobileDeviceSelect } from "./MetricsRowDesignerMobileDeviceSelect";
import { MetricsRowDesignerPreviewThemeSelect } from "./MetricsRowDesignerPreviewThemeSelect";
import { useMetricsRowDesignerLayoutPreviewWrappers } from "./use-metrics-row-designer-layout-preview-wrappers";

interface MetricsRowDesignerPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MetricsRowDesignerPreviewPanel({
  withStructureChrome = false,
}: MetricsRowDesignerPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const {
    editor,
    activeTabId,
    previewBreakpoint,
    previewMobileDeviceId,
    previewColorScheme,
  } = useMetricsRowDesigner();
  const { getDefinition, items } = useEntityCatalog();

  const structureWrappers =
    useMetricsRowDesignerLayoutPreviewWrappers(withStructureChrome);

  const previewLayout =
    activeTabId === "row"
      ? editor.metricRowLayout
      : editor.selectedWidget?.layout;

  const previewContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: {},
        definition: editor.definition,
        locale: i18n.language,
        usePreviewPlaceholder: true,
        usePreviewSamples: true,
        listFilters: {},
        routeParams: {},
        catalogItems: items,
        getDefinition,
        t,
      }),
    [editor.definition, getDefinition, i18n.language, items, t],
  );

  const mobilePreviewDevice = useMemo(
    () =>
      previewBreakpoint === "base"
        ? resolveMobilePreviewDevice(previewMobileDeviceId)
        : null,
    [previewBreakpoint, previewMobileDeviceId],
  );

  const previewBody =
    previewLayout != null ? (
      <RecursiveLayoutRenderer
        layout={previewLayout}
        context={previewContext}
        className={
          withStructureChrome ? designerPreviewLayoutFillClassName : undefined
        }
        rowWrapper={structureWrappers?.rowWrapper}
        rootColumnWrapper={structureWrappers?.rootColumnWrapper}
        nestedColumnWrapper={structureWrappers?.nestedColumnWrapper}
      />
    ) : (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.widgets.noWidgetSelected")}
      </Text>
    );

  const viewport = mobilePreviewDevice ? (
    <MobileDevicePreviewFrame
      device={mobilePreviewDevice}
      breakpoint={previewBreakpoint}
      className="h-full"
      fillHeight={withStructureChrome}
    >
      {previewBody}
    </MobileDevicePreviewFrame>
  ) : (
    <LayoutPreviewViewport
      breakpoint={previewBreakpoint}
      className="h-full"
      fillHeight={withStructureChrome}
    >
      {previewBody}
    </LayoutPreviewViewport>
  );

  const themedViewport = (
    <FormDesignerPreviewThemeScope colorScheme={previewColorScheme}>
      {viewport}
    </FormDesignerPreviewThemeScope>
  );

  return (
    <DesignerPreviewPanelShell
      fillHeight={withStructureChrome}
      controls={
        <>
          <MetricsRowDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <MetricsRowDesignerMobileDeviceSelect />
          ) : null}
        </>
      }
    >
      {themedViewport}
    </DesignerPreviewPanelShell>
  );
}
