import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { createTenantDashboardLayoutRenderContext } from "../ui-builder/create-tenant-dashboard-layout-render-context";
import { useDashboardViewFilterUrlState } from "../ui-builder/use-dashboard-view-filter-url-state";
import { ViewFilterPageProvider } from "../ui-builder/view-filter-page-context";
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

  const { urlState } = useDashboardViewFilterUrlState({
    dashboardLayout: editor.dashboardLayout,
    sections: editor.dashboardSections,
    catalog: items,
  });

  const previewContext = useMemo(
    () =>
      createTenantDashboardLayoutRenderContext({
        sections: editor.dashboardSections,
        catalogItems: items,
        locale: i18n.language,
        t,
        getDefinition,
        pageFilters: urlState.filters,
        user: user
          ? {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            }
          : null,
      }),
    [
      editor.dashboardSections,
      getDefinition,
      i18n.language,
      items,
      t,
      urlState.filters,
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
      <ViewFilterPageProvider value={urlState}>
        <RecursiveLayoutRenderer
          layout={previewLayout}
          context={previewContext}
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
          <DashboardLayoutDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <DashboardLayoutDesignerMobileDeviceSelect />
          ) : null}
        </div>
      </div>
      <div className="min-h-96 overflow-auto py-2">{themedViewport}</div>
    </div>
  );
}
