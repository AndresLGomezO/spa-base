import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { EntityMainPageShell } from "../../components/entity/EntityMainPageShell";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { createEntityMainPageRenderContext } from "../ui-builder/create-entity-main-page-render-context";
import { createDefaultMetricRowLayout } from "../ui-builder/create-default-metric-row-layout";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useMainViewDesigner } from "./main-view-designer-context";
import { useOptionalMainViewDesignerStructureSession } from "./MainViewDesignerStructureSession";
import { MainViewDesignerPreviewThemeSelect } from "./MainViewDesignerPreviewThemeSelect";

interface MainViewDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MainViewDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: MainViewDesignerUnifiedPreviewPanelProps) {
  const { i18n } = useTranslation("common");
  const {
    editor,
    previewColorScheme,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useMainViewDesigner();
  const structureSession = useOptionalMainViewDesignerStructureSession();
  const frameRef = useRef<HTMLDivElement>(null);

  const previewStrategy = useMemo(() => resolvePreviewStrategy("mainPage"), []);

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

  const layout = editor.layout;
  const adapters = useLayoutStructureOverlayAdapters({
    enabled: withStructureChrome,
    layout,
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks: false,
  });

  const previewBody = (
    <LayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      adapters={adapters}
      className="relative min-h-0 min-w-0 flex-1"
    >
      <EntityMainPageShell layout={layout} context={previewContext} />
    </LayoutStructureOverlay>
  );

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={withStructureChrome}
      colorScheme={previewColorScheme}
      themeControls={<MainViewDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
