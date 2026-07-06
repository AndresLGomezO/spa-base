import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolvePreviewStrategy,
  toEditableLayoutDocument,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { createTenantDashboardLayoutRenderContext } from "../ui-builder/create-tenant-dashboard-layout-render-context";
import { useDashboardViewFilterUrlState } from "../ui-builder/use-dashboard-view-filter-url-state";
import { ViewFilterPageProvider } from "../ui-builder/view-filter-page-context";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { isShellLayoutFocus } from "./dashboard-layout-designer-tabs";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerPreviewThemeSelect } from "./DashboardLayoutDesignerPreviewThemeSelect";
import { useDashboardLayoutDesignerLayoutPreviewWrappers } from "./use-dashboard-layout-designer-layout-preview-wrappers";

interface DashboardLayoutDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DashboardLayoutDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: DashboardLayoutDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { getDefinition, items } = useEntityCatalog();
  const { editor, designFocus, previewColorScheme } =
    useDashboardLayoutDesigner();

  const structureWrappers =
    useDashboardLayoutDesignerLayoutPreviewWrappers(withStructureChrome);

  const previewLayout = isShellLayoutFocus(designFocus)
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

  const previewStrategy = useMemo(
    () =>
      resolvePreviewStrategy(
        isShellLayoutFocus(designFocus)
          ? "dashboardLayout"
          : "dashboardSection",
      ),
    [designFocus],
  );

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
        previewMode: true,
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

  const editableLayout = useMemo(
    () => (previewLayout ? toEditableLayoutDocument(previewLayout) : null),
    [previewLayout],
  );

  const previewBody =
    editableLayout != null ? (
      <ViewFilterPageProvider value={pageState}>
        <RecursiveLayoutRenderer
          layout={editableLayout}
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

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={withStructureChrome}
      colorScheme={previewColorScheme}
      themeControls={<DashboardLayoutDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
