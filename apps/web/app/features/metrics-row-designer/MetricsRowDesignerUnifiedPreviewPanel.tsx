import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  defaultDateFilterParam,
  resolvePreviewStrategy,
} from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { createEntityLayoutRenderContext } from "../ui-builder/create-entity-layout-render-context";
import { getCurrentDateBucket } from "../ui-builder/use-dashboard-date-filter-url-state";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { useOptionalMetricsRowDesignerStructureSession } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerPreviewThemeSelect } from "./MetricsRowDesignerPreviewThemeSelect";

interface MetricsRowDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MetricsRowDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: MetricsRowDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const {
    editor,
    activeTabId,
    previewColorScheme,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useMetricsRowDesigner();
  const structureSession = useOptionalMetricsRowDesignerStructureSession();
  const { getDefinition, items } = useEntityCatalog();
  const frameRef = useRef<HTMLDivElement>(null);

  const previewLayout =
    activeTabId === "row"
      ? editor.metricRowLayout
      : editor.selectedWidget?.layout;

  const previewStrategy = useMemo(
    () =>
      resolvePreviewStrategy(
        activeTabId === "row" ? "metricRow" : "metricWidget",
      ),
    [activeTabId],
  );

  const dashboardDateFilter = useMemo((): DashboardDateFilterContextValue => {
    const granularity = "month" as const;
    return {
      value: getCurrentDateBucket(granularity),
      granularity,
      param: defaultDateFilterParam(granularity),
    };
  }, []);

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
        dashboardDateFilter,
        catalogItems: items,
        getDefinition,
        t,
      }),
    [
      dashboardDateFilter,
      editor.definition,
      getDefinition,
      i18n.language,
      items,
      t,
    ],
  );

  const adapters = useLayoutStructureOverlayAdapters({
    enabled: withStructureChrome && previewLayout != null,
    layout:
      previewLayout ??
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
    previewLayout != null ? (
      <LayoutStructureOverlay
        frameRef={frameRef}
        layout={previewLayout}
        enabled={withStructureChrome}
        adapters={adapters}
        className="relative min-h-0 min-w-0 flex-1"
      >
        <RecursiveLayoutRenderer
          layout={previewLayout}
          context={previewContext}
        />
      </LayoutStructureOverlay>
    ) : (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.widgets.noWidgetSelected")}
      </Text>
    );

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={withStructureChrome}
      colorScheme={previewColorScheme}
      themeControls={<MetricsRowDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
