import { Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  defaultDateFilterParam,
  resolvePreviewStrategy,
  toEditableLayoutDocument,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { createEntityLayoutRenderContext } from "../ui-builder/create-entity-layout-render-context";
import { getCurrentDateBucket } from "../ui-builder/use-dashboard-date-filter-url-state";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerPreviewThemeSelect } from "./MetricsRowDesignerPreviewThemeSelect";
import { useMetricsRowDesignerLayoutPreviewWrappers } from "./use-metrics-row-designer-layout-preview-wrappers";

interface MetricsRowDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MetricsRowDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: MetricsRowDesignerUnifiedPreviewPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { editor, activeTabId, previewColorScheme } = useMetricsRowDesigner();
  const { getDefinition, items } = useEntityCatalog();

  const structureWrappers =
    useMetricsRowDesignerLayoutPreviewWrappers(withStructureChrome);

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

  const editableLayout = useMemo(
    () => (previewLayout ? toEditableLayoutDocument(previewLayout) : null),
    [previewLayout],
  );

  const previewBody =
    editableLayout != null ? (
      <RecursiveLayoutRenderer
        layout={editableLayout}
        context={previewContext}
        rowWrapper={structureWrappers?.rowWrapper}
        rootColumnWrapper={structureWrappers?.rootColumnWrapper}
        nestedColumnWrapper={structureWrappers?.nestedColumnWrapper}
      />
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
