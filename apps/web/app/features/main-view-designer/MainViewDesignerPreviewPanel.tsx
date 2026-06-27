import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { createEntityMainPageRenderContext } from "../ui-builder/create-entity-main-page-render-context";
import { createDefaultMetricRowLayout } from "../ui-builder/create-default-metric-row-layout";
import { designerPreviewLayoutFillClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DesignerPreviewPanelShell } from "../ui-builder/DesignerPreviewPanelShell";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerPreviewThemeScope } from "../form-designer/FormDesignerPreviewThemeScope";
import { MobileDevicePreviewFrame } from "../form-designer/MobileDevicePreviewFrame";
import { resolveMobilePreviewDevice } from "../form-designer/mobile-preview-device-presets";
import { useMainViewDesigner } from "./main-view-designer-context";
import { MainViewDesignerMobileDeviceSelect } from "./MainViewDesignerMobileDeviceSelect";
import { MainViewDesignerPreviewThemeSelect } from "./MainViewDesignerPreviewThemeSelect";
import { useMainViewDesignerLayoutPreviewWrappers } from "./use-main-view-designer-layout-preview-wrappers";

interface MainViewDesignerPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MainViewDesignerPreviewPanel({
  withStructureChrome = false,
}: MainViewDesignerPreviewPanelProps) {
  const { i18n } = useTranslation("common");
  const {
    editor,
    previewBreakpoint,
    previewMobileDeviceId,
    previewColorScheme,
  } = useMainViewDesigner();

  const structureWrappers =
    useMainViewDesignerLayoutPreviewWrappers(withStructureChrome);

  const metricRowLayoutForPreview = useMemo(
    () =>
      editor.definition.ui.metricRowLayout ?? createDefaultMetricRowLayout(),
    [editor.definition.ui.metricRowLayout],
  );

  const previewContext = useMemo(
    () =>
      createEntityMainPageRenderContext({
        entityName: editor.entityName,
        entityLabel: editor.definition.ui.nav?.label ?? editor.entityName,
        locale: i18n.language,
        canCreate: true,
        metricRowLayout: metricRowLayoutForPreview,
        entityDefinition: editor.definition,
        listFilters: {},
        routeParams: {},
        toolbar: {
          search: "",
          setSearch: () => undefined,
          filters: {},
          setFilter: () => undefined,
          sort: { columnId: null, direction: "asc" },
          setSortColumn: () => undefined,
          toggleSortDirection: () => undefined,
          filterOptions: {},
          activeBadges: [],
          clearAll: () => undefined,
          columns: [],
          filtersOpen: false,
          onFiltersOpenChange: () => undefined,
          showSearch: true,
        },
        ViewComponent: () => null,
        listViewProps: {},
        onCreate: () => undefined,
        previewMode: true,
        metricsDesignerPath: designLayoutEntityPath(
          "metrics",
          editor.entityName,
        ),
      }),
    [
      editor.definition,
      editor.entityName,
      i18n.language,
      metricRowLayoutForPreview,
    ],
  );

  const mobilePreviewDevice = useMemo(
    () =>
      previewBreakpoint === "base"
        ? resolveMobilePreviewDevice(previewMobileDeviceId)
        : null,
    [previewBreakpoint, previewMobileDeviceId],
  );

  const previewBody = (
    <RecursiveLayoutRenderer
      layout={editor.layout}
      context={previewContext}
      className={
        withStructureChrome ? designerPreviewLayoutFillClassName : undefined
      }
      rowWrapper={structureWrappers?.rowWrapper}
      rootColumnWrapper={structureWrappers?.rootColumnWrapper}
      nestedColumnWrapper={structureWrappers?.nestedColumnWrapper}
    />
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
          <MainViewDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <MainViewDesignerMobileDeviceSelect />
          ) : null}
        </>
      }
    >
      {themedViewport}
    </DesignerPreviewPanelShell>
  );
}
