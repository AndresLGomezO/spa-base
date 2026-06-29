import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { createTenantDashboardLayoutRenderContext } from "../ui-builder/create-tenant-dashboard-layout-render-context";
import { useDashboardViewFilterUrlState } from "../ui-builder/use-dashboard-view-filter-url-state";
import { ViewFilterPageProvider } from "../ui-builder/view-filter-page-context";
import { designerPreviewLayoutFillClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DesignerPreviewPanelShell } from "../ui-builder/DesignerPreviewPanelShell";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { FormDesignerPreviewThemeScope } from "../form-designer/FormDesignerPreviewThemeScope";
import { MobileDevicePreviewFrame } from "../form-designer/MobileDevicePreviewFrame";
import { resolveMobilePreviewDevice } from "../form-designer/mobile-preview-device-presets";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerMobileDeviceSelect } from "./DashboardLayoutDesignerMobileDeviceSelect";
import { DashboardLayoutDesignerPreviewThemeSelect } from "./DashboardLayoutDesignerPreviewThemeSelect";
import { useDashboardLayoutDesignerLayoutPreviewWrappers } from "./use-dashboard-layout-designer-layout-preview-wrappers";

interface DashboardLayoutDesignerPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DashboardLayoutDesignerPreviewPanel({
  withStructureChrome = false,
}: DashboardLayoutDesignerPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { getDefinition, items } = useEntityCatalog();
  const {
    editor,
    activeTabId,
    previewBreakpoint,
    previewMobileDeviceId,
    previewColorScheme,
  } = useDashboardLayoutDesigner();

  const structureWrappers =
    useDashboardLayoutDesignerLayoutPreviewWrappers(withStructureChrome);

  const previewLayout =
    activeTabId === "layout"
      ? editor.dashboardLayout
      : editor.selectedSection?.layout;

  const { collected, pageState } = useDashboardViewFilterUrlState({
    dashboardLayout: editor.dashboardLayout,
    sections: editor.dashboardSections,
    catalog: items,
  });

  const dashboardDateFilter = useMemo(():
    | DashboardDateFilterContextValue
    | undefined => {
    const config = collected.dateFilterConfig;
    if (!config || !pageState.dateFilter.value) {
      return undefined;
    }

    return {
      value: pageState.dateFilter.value,
      granularity: config.granularity,
      param: config.param,
    };
  }, [collected.dateFilterConfig, pageState.dateFilter.value]);

  const previewContext = useMemo(
    () =>
      createTenantDashboardLayoutRenderContext({
        sections: editor.dashboardSections,
        catalogItems: items,
        locale: i18n.language,
        t,
        getDefinition,
        pageFilters: pageState.filters,
        dashboardDateFilter,
        user: user
          ? {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            }
          : null,
      }),
    [
      dashboardDateFilter,
      editor.dashboardSections,
      getDefinition,
      i18n.language,
      items,
      pageState.filters,
      t,
      user,
    ],
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
      <ViewFilterPageProvider value={pageState}>
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
      </ViewFilterPageProvider>
    ) : (
      <Text className="text-muted-foreground text-sm">
        {t("dashboardLayoutDesigner.sections.noSectionSelected")}
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
          <DashboardLayoutDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <DashboardLayoutDesignerMobileDeviceSelect />
          ) : null}
        </>
      }
    >
      {themedViewport}
    </DesignerPreviewPanelShell>
  );
}
