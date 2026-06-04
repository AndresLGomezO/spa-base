import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder.js";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell.js";
import { DockedMetricsStripPreview } from "./DockedMetricsStripPreview.js";
import { motionPresetEditorLabels } from "./ui-builder-motion-labels.js";
import type { UseEntityMetricsLayoutEditorResult } from "./use-entity-metrics-layout-editor.js";

interface EntityMetricsLayoutDesignEditorProps {
  readonly editor: UseEntityMetricsLayoutEditorResult;
}

export function EntityMetricsLayoutDesignEditor({
  editor,
}: EntityMetricsLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");

  const structureLabels = useMemo(() => {
    const styleRules = {
      addStyleRule: t("entity.viewSettings.addStyleRule"),
      removeStyleRule: t("entity.viewSettings.removeStyleRule"),
      styleProperty: t("entity.viewSettings.styleProperty"),
      styleValue: t("entity.viewSettings.styleValue"),
    };

    return {
      structure: t("designLayout.metricsStripStructure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      styleRules,
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
        styleRules,
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
    };
  }, [t]);

  const defaultFieldPath = useMemo(() => {
    const fields = Object.keys(editor.definition.fields);
    return fields[0] ?? "name";
  }, [editor.definition.fields]);

  return (
    <DesignLayoutEditorShell
      preview={
        <DockedMetricsStripPreview
          enabled
          stripLayout={editor.metricStripLayout}
          entityDefinition={editor.definition}
          locale={i18n.language}
        />
      }
    >
      <EntityCardLayoutBuilder
        layout={editor.metricStripLayout}
        definition={editor.definition}
        defaultFieldPath={defaultFieldPath}
        onLayoutChange={editor.setMetricStripLayout}
        designSurface="metricStrip"
        labels={structureLabels}
        showStructureHeading
      />
    </DesignLayoutEditorShell>
  );
}
