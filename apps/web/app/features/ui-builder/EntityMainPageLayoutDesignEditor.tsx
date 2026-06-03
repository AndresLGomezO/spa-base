import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { Text } from "@repo/ui";

import type { EntityName } from "../../entities/entity-catalog";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { MetricWidgetsBuilderSection } from "../../components/metrics/MetricWidgetsBuilderSection";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import {
  useEntityMainPageLayoutEditor,
  type UseEntityMainPageLayoutEditorResult,
} from "./use-entity-main-page-layout-editor";
import { createEntityMainPageRenderContext } from "./create-entity-main-page-render-context";
import { EntityTable } from "../../components/entity/EntityTable";

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
      styleRules: {
        addStyleRule: t("entity.viewSettings.addStyleRule"),
        removeStyleRule: t("entity.viewSettings.removeStyleRule"),
        styleProperty: t("entity.viewSettings.styleProperty"),
        styleValue: t("entity.viewSettings.styleValue"),
      },
      columnTab: (column: number) =>
        t("entity.viewSettings.columnTab", { column }),
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
        metricWidgets: editor.metricWidgets,
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
        ViewComponent: EntityTable,
        listViewProps: {},
        onCreate: () => undefined,
        previewMode: true,
      }),
    [
      editor.definition.ui.nav?.label,
      editor.metricWidgets,
      entityName,
      i18n.language,
    ],
  );

  const preview = (
    <div className="bg-card border-border rounded-lg border p-4">
      <Text className="text-muted-foreground mb-3 text-sm">
        {t("entity.viewSettings.preview")}
      </Text>
      <RecursiveLayoutRenderer
        layout={editor.layout}
        context={previewContext}
      />
    </div>
  );

  return (
    <DesignLayoutEditorShell preview={preview}>
      <CollapsibleSection
        title={t("entity.viewSettings.metrics.title")}
        defaultOpen={false}
      >
        <MetricWidgetsBuilderSection
          widgets={editor.metricWidgets}
          entityDefinition={editor.definition}
          filterFieldOptions={editor.filterFieldOptions}
          onChange={editor.setMetricWidgets}
        />
      </CollapsibleSection>
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
