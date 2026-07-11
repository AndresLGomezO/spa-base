import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  ensureContainerRoot,
  resolvePreviewStrategy,
} from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { createTenantDashboardLayoutRenderContext } from "../ui-builder/create-tenant-dashboard-layout-render-context";
import { useDashboardViewFilterUrlState } from "../ui-builder/use-dashboard-view-filter-url-state";
import { ViewFilterPageProvider } from "../ui-builder/view-filter-page-context";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { isShellLayoutFocus } from "./dashboard-layout-designer-tabs";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { useOptionalDashboardLayoutDesignerStructureSession } from "./DashboardLayoutDesignerStructureSession";
import { DashboardLayoutDesignerPreviewThemeSelect } from "./DashboardLayoutDesignerPreviewThemeSelect";

interface DashboardLayoutDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function DashboardLayoutDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: DashboardLayoutDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { getDefinition, items } = useEntityCatalog();
  const {
    editor,
    designFocus,
    previewColorScheme,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useDashboardLayoutDesigner();
  const structureSession = useOptionalDashboardLayoutDesignerStructureSession();
  const frameRef = useRef<HTMLDivElement>(null);

  const structureChromeEnabled =
    withStructureChrome && !isShellLayoutFocus(designFocus);

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

  const renderLayout = useMemo(() => {
    if (!previewLayout) {
      return null;
    }

    if (isShellLayoutFocus(designFocus)) {
      return ensureContainerRoot(previewLayout);
    }

    // Canonical layout — never toEditableLayoutDocument on the render path.
    return previewLayout;
  }, [designFocus, previewLayout]);

  const adapters = useLayoutStructureOverlayAdapters({
    enabled: structureChromeEnabled && renderLayout != null,
    layout:
      renderLayout ??
      ({
        root: {
          type: "root",
          id: "empty",
          columnCount: 1,
          columns: [],
        },
        showActions: false,
      } as const),
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks: false,
  });

  const previewBody =
    renderLayout != null ? (
      <ViewFilterPageProvider value={pageState}>
        <LayoutStructureOverlay
          frameRef={frameRef}
          layout={renderLayout}
          enabled={structureChromeEnabled}
          adapters={adapters}
          className="relative min-h-0 min-w-0 flex-1"
        >
          <RecursiveLayoutRenderer
            layout={renderLayout}
            context={previewContext}
          />
        </LayoutStructureOverlay>
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
