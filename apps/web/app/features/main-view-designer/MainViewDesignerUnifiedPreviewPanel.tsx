import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolvePreviewStrategy,
  toEditableLayoutDocument,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { createEntityMainPageRenderContext } from "../ui-builder/create-entity-main-page-render-context";
import { createDefaultMetricRowLayout } from "../ui-builder/create-default-metric-row-layout";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useMainViewDesigner } from "./main-view-designer-context";
import { MainViewDesignerPreviewThemeSelect } from "./MainViewDesignerPreviewThemeSelect";
import { useMainViewDesignerLayoutPreviewWrappers } from "./use-main-view-designer-layout-preview-wrappers";

interface MainViewDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function MainViewDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: MainViewDesignerUnifiedPreviewPanelProps) {
  const { i18n } = useTranslation("common");
  const { editor, previewColorScheme } = useMainViewDesigner();

  const structureWrappers =
    useMainViewDesignerLayoutPreviewWrappers(withStructureChrome);

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

  const editableLayout = useMemo(
    () => toEditableLayoutDocument(editor.layout),
    [editor.layout],
  );

  const previewBody = (
    <RecursiveLayoutRenderer
      layout={editableLayout}
      context={previewContext}
      rowWrapper={structureWrappers?.rowWrapper}
      rootColumnWrapper={structureWrappers?.rootColumnWrapper}
      nestedColumnWrapper={structureWrappers?.nestedColumnWrapper}
    />
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
