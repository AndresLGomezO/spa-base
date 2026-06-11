import { useMemo, useState } from "react";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";
import { motionPresetEditorLabels } from "./ui-builder-motion-labels.js";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { Text } from "@repo/ui";

import type { EntityName } from "../../entities/entity-catalog";
import { metricStripLayoutFromView } from "@repo/entities";
import { designLayoutEntityPath } from "../../routing/design-layout-nav.js";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import {
  DEFAULT_LAYOUT_PREVIEW_BREAKPOINT,
  LayoutPreviewPanel,
} from "./LayoutPreviewPanel";
import {
  useEntityMainPageLayoutEditor,
  type UseEntityMainPageLayoutEditorResult,
} from "./use-entity-main-page-layout-editor";
import { createEntityMainPageRenderContext } from "./create-entity-main-page-render-context";
import { responsiveGridEditorLabels } from "./responsive-grid-editor-labels";
import { componentDisplayRangeEditorLabels } from "./component-display-range-editor-labels";

interface EntityMainPageLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly editor?: UseEntityMainPageLayoutEditorResult;
}

export function EntityMainPageLayoutDesignEditor({
  entityName,
  editor: editorProp,
}: EntityMainPageLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const internalEditor = useEntityMainPageLayoutEditor(entityName);
  const editor = editorProp ?? internalEditor;
  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<ResponsiveGridBreakpoint>(DEFAULT_LAYOUT_PREVIEW_BREAKPOINT);

  const metricStripLayoutForPreview = useMemo(() => {
    const tableView = editor.definition.ui.views.find(
      (view) => view.type === "table",
    );
    return metricStripLayoutFromView(
      tableView?.type === "table" ? tableView.metricStripLayout : undefined,
    );
  }, [editor.definition.ui.views]);

  const structureLabels = useMemo(
    () => ({
      structure: t("designLayout.mainPageStructure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      responsiveGrid: responsiveGridEditorLabels(t),
      displayRange: componentDisplayRangeEditorLabels(t),
      rowLayoutStyles: t("entity.viewSettings.responsiveGrid.rowLayoutStyles"),
      styleRules: {
        addStyleRule: t("entity.viewSettings.addStyleRule"),
        removeStyleRule: t("entity.viewSettings.removeStyleRule"),
        styleProperty: t("entity.viewSettings.styleProperty"),
        styleValue: t("entity.viewSettings.styleValue"),
      },
      motion: motionPresetEditorLabels(t),
      layoutEffects: t("entity.viewSettings.layoutEffects"),
      rowStyles: t("entity.viewSettings.rowStyles"),
      rowEffects: t("entity.viewSettings.rowEffects"),
      columnTab: (column: number) =>
        t("entity.viewSettings.columnTab", { column }),
      columnWidthPercent: t("entity.viewSettings.columnWidthPercent"),
      columnWidthAutoHint: (percent: number) =>
        t("entity.viewSettings.columnWidthAutoHint", { percent }),
      moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
      moveColumnRight: t("entity.viewSettings.moveColumnRight"),
      deleteColumn: (column: number) =>
        t("entity.viewSettings.deleteColumn", { column }),
      addRow: t("entity.viewSettings.addSlot"),
      componentRow: t("entity.viewSettings.component"),
      nestedRow: t("entity.viewSettings.slotColumns"),
      emptyColumn: t("entity.viewSettings.emptyColumn"),
      moveUp: t("entity.viewSettings.moveSlotUp"),
      moveDown: t("entity.viewSettings.moveSlotDown"),
      deleteRow: t("entity.viewSettings.deleteSlot"),
      componentEditor: {
        component: t("entity.viewSettings.component"),
        staticValue: t("entity.viewSettings.staticValue"),
        field: t("entity.viewSettings.field"),
        fallbacks: t("entity.viewSettings.fallbacks"),
        remove: t("entity.viewSettings.remove"),
        addFallback: t("entity.viewSettings.addFallback"),
        slotSettings: t("entity.viewSettings.slotSettings"),
        componentStyles: t("entity.viewSettings.componentStyles"),
        badgeColorRules: t("entity.viewSettings.badgeColorRules"),
        matchValue: t("entity.viewSettings.matchValue"),
        addRule: t("entity.viewSettings.addRule"),
        imageSize: t("entity.viewSettings.imageSize"),
        dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
        displayFormat: t("entity.viewSettings.displayFormat"),
        showCurrency: t("entity.viewSettings.showCurrency"),
        showToneColors: t("entity.viewSettings.showToneColors"),
        styleRules: {
          addStyleRule: t("entity.viewSettings.addStyleRule"),
          removeStyleRule: t("entity.viewSettings.removeStyleRule"),
          styleProperty: t("entity.viewSettings.styleProperty"),
          styleValue: t("entity.viewSettings.styleValue"),
        },
        label: {
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("entity.viewSettings.label"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        },
      },
    }),
    [t],
  );

  const previewContext = useMemo(
    () =>
      createEntityMainPageRenderContext({
        entityName,
        entityLabel: editor.definition.ui.nav?.label ?? entityName,
        locale: i18n.language,
        canCreate: true,
        metricStripLayout: metricStripLayoutForPreview,
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
        metricsDesignerPath: designLayoutEntityPath("metrics", entityName),
      }),
    [editor.definition, entityName, i18n.language, metricStripLayoutForPreview],
  );

  const preview = (
    <LayoutPreviewPanel
      title={t("entity.viewSettings.preview")}
      breakpoint={previewBreakpoint}
      onBreakpointChange={setPreviewBreakpoint}
    >
      <RecursiveLayoutRenderer
        layout={editor.layout}
        context={previewContext}
      />
    </LayoutPreviewPanel>
  );

  return (
    <DesignLayoutEditorShell preview={preview}>
      <Text variant="muted" className="text-sm">
        {t("designLayout.metricsConfigureLink")}{" "}
        <Link
          to={designLayoutEntityPath("metrics", entityName)}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("nav.designLayoutMetrics")}
        </Link>
      </Text>
      <EntityCardLayoutBuilder
        key={editor.layoutEditorKey}
        layout={editor.layout}
        definition={editor.definition}
        defaultFieldPath="name"
        onLayoutChange={editor.setLayout}
        labels={structureLabels}
        designSurface="mainPage"
      />
    </DesignLayoutEditorShell>
  );
}
