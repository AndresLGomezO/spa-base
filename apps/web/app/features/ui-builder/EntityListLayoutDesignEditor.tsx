import { useMemo } from "react";
import { updateLayoutMeta } from "@repo/ui-builder-core";
import type { MotionEntrance } from "@repo/ui-builder-core";
import { SegmentedSwitch, Text, type SegmentedSwitchOption } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import { CollapsibleSection } from "../../components/CollapsibleSection.js";
import {
  clampCardsPerRow,
  MAX_CARDS_PER_ROW,
  MIN_CARDS_PER_ROW,
} from "../../components/entity/entity-card-list-grid.js";
import { MetricWidgetsBuilderSection } from "../../components/metrics/MetricWidgetsBuilderSection.js";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder.js";
import { DockedCardLayoutPreview } from "./DockedCardLayoutPreview.js";
import {
  useEntityListLayoutEditor,
  type UseEntityListLayoutEditorResult,
} from "./use-entity-list-layout-editor.js";

const CARDS_PER_ROW_SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const ENTRANCE_OPTIONS: readonly MotionEntrance[] = [
  "none",
  "fade",
  "slide-up",
  "scale",
];

interface EntityListLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly previewItem: Record<string, unknown> | null;
  readonly editor?: UseEntityListLayoutEditorResult;
}

export function EntityListLayoutDesignEditor({
  entityName,
  previewItem,
  editor: editorProp,
}: EntityListLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const internalEditor = useEntityListLayoutEditor(entityName);
  const editor = editorProp ?? internalEditor;

  const viewTypeOptions = useMemo(
    (): readonly SegmentedSwitchOption<"table" | "card" | "compact">[] => [
      {
        value: "table",
        label: t("entity.viewSettings.table"),
        ariaLabel: t("entity.viewSettings.table"),
      },
      {
        value: "card",
        label: t("entity.viewSettings.card"),
        ariaLabel: t("entity.viewSettings.card"),
      },
      {
        value: "compact",
        label: t("designLayout.presentationCompact"),
        ariaLabel: t("designLayout.presentationCompact"),
      },
    ],
    [t],
  );

  const structureLabels = useMemo(() => {
    const styleRules = {
      addStyleRule: t("entity.viewSettings.addStyleRule"),
      removeStyleRule: t("entity.viewSettings.removeStyleRule"),
      styleProperty: t("entity.viewSettings.styleProperty"),
      styleValue: t("entity.viewSettings.styleValue"),
    };

    return {
      structure: t("designLayout.listItemStructure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      styleRules,
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

  const cardsPerRow = clampCardsPerRow(editor.layout.cardsPerRow);
  const entrance = editor.layout.motion?.entrance ?? "none";

  const setCardsPerRow = (value: number) => {
    editor.setLayout(
      updateLayoutMeta(editor.layout, {
        cardsPerRow: clampCardsPerRow(value),
      }),
    );
  };

  const setEntrance = (value: MotionEntrance) => {
    editor.setLayout(
      updateLayoutMeta(editor.layout, {
        motion: {
          ...editor.layout.motion,
          entrance: value,
          staggerIndex: value !== "none",
        },
      }),
    );
  };

  const metricWidgets =
    editor.viewType === "table"
      ? editor.tableMetricWidgets
      : editor.cardMetricWidgets;

  const setMetricWidgets =
    editor.viewType === "table"
      ? editor.setTableMetricWidgets
      : editor.setCardMetricWidgets;

  return (
    <div className="flex flex-col gap-6">
      <CollapsibleSection
        title={t("entity.viewSettings.metrics.title")}
        defaultOpen={false}
      >
        <MetricWidgetsBuilderSection
          widgets={metricWidgets}
          entityDefinition={editor.definition}
          filterFieldOptions={editor.filterFieldOptions}
          onChange={setMetricWidgets}
        />
      </CollapsibleSection>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">
          {t("designLayout.presentation")}
        </span>
        <SegmentedSwitch
          value={editor.viewType}
          options={viewTypeOptions}
          onChange={editor.setViewType}
          ariaLabel={t("designLayout.presentation")}
        />
      </div>

      <DockedCardLayoutPreview
        enabled
        layout={editor.layout}
        definition={editor.definition}
        previewItem={previewItem}
        title={t("entity.viewSettings.preview")}
        locale={i18n.language}
        getDefinition={getDefinition}
      />

      <div className="flex flex-col gap-3">
        <Text className="font-medium">{structureLabels.structure}</Text>
        {editor.viewType === "card" ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {t("entity.viewSettings.cardsPerRow")}
              </span>
              <select
                className={CARDS_PER_ROW_SELECT_CLASS}
                value={cardsPerRow}
                onChange={(event) =>
                  setCardsPerRow(Number.parseInt(event.target.value, 10))
                }
              >
                {Array.from(
                  { length: MAX_CARDS_PER_ROW - MIN_CARDS_PER_ROW + 1 },
                  (_, index) => {
                    const value = MIN_CARDS_PER_ROW + index;
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  },
                )}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editor.layout.showActions ?? true}
                onChange={(event) =>
                  editor.setLayout(
                    updateLayoutMeta(editor.layout, {
                      showActions: event.target.checked,
                    }),
                  )
                }
              />
              <span>{t("entity.viewSettings.showActions")}</span>
            </label>
          </div>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.motionEntrance")}
          </span>
          <select
            className={CARDS_PER_ROW_SELECT_CLASS}
            value={entrance}
            onChange={(event) =>
              setEntrance(event.target.value as MotionEntrance)
            }
          >
            {ENTRANCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <EntityCardLayoutBuilder
          key={editor.layoutEditorKey}
          layout={editor.layout}
          definition={editor.definition}
          defaultFieldPath={editor.defaultFieldPath}
          onLayoutChange={editor.setLayout}
          labels={structureLabels}
          showStructureHeading={false}
          getDefinition={getDefinition}
        />
      </div>

      {editor.viewType === "table" ? (
        <p className="text-muted-foreground text-sm">
          {t("designLayout.listTableHybridHint")}
        </p>
      ) : null}
    </div>
  );
}
