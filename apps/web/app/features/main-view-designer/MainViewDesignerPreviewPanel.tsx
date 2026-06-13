import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { createEntityMainPageRenderContext } from "../ui-builder/create-entity-main-page-render-context";
import { createDefaultMetricRowLayout } from "../ui-builder/create-default-metric-row-layout";
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
  const { t, i18n } = useTranslation("common");
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
          <MainViewDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <MainViewDesignerMobileDeviceSelect />
          ) : null}
        </div>
      </div>
      <div className="min-h-96 overflow-auto py-2">{themedViewport}</div>
    </div>
  );
}
