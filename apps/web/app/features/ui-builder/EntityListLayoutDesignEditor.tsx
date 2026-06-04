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
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder.js";
import { DockedCardLayoutPreview } from "./DockedCardLayoutPreview.js";
import { DockedExpandableTableLayoutPreview } from "./DockedExpandableTableLayoutPreview.js";
import { EntityListTableLayoutPreview } from "./EntityListTableLayoutPreview.js";
import { ExpandableTableColumnsEditor } from "./ExpandableTableColumnsEditor.js";
import { TableViewFieldsEditor } from "./TableViewFieldsEditor.js";
import {
  useEntityListLayoutEditor,
  type UseEntityListLayoutEditorResult,
} from "./use-entity-list-layout-editor.js";
import { motionPresetEditorLabels } from "./ui-builder-motion-labels.js";

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
    (): readonly SegmentedSwitchOption<
      "table" | "card" | "expandableTable"
    >[] => [
      {
        value: "table",
        label: t("entity.viewSettings.table"),
        ariaLabel: t("entity.viewSettings.table"),
      },
      {
        value: "expandableTable",
        label: t("designLayout.presentationExpandableTable"),
        ariaLabel: t("designLayout.presentationExpandableTable"),
      },
      {
        value: "card",
        label: t("entity.viewSettings.card"),
        ariaLabel: t("entity.viewSettings.card"),
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

  const cardPreviewProps = {
    layout: editor.layout,
    definition: editor.definition,
    previewItem,
    title: t("entity.viewSettings.preview"),
    locale: i18n.language,
    getDefinition,
  };

  const listPreview = (() => {
    switch (editor.viewType) {
      case "table":
        return (
          <EntityListTableLayoutPreview
            definition={editor.definition}
            tableFields={editor.tableFields}
            showActions={editor.tableShowActions}
            previewItem={previewItem}
            title={t("entity.viewSettings.preview")}
            locale={i18n.language}
          />
        );
      case "expandableTable":
        return (
          <DockedExpandableTableLayoutPreview
            enabled
            definition={editor.definition}
            columns={editor.expandableColumns}
            rowExpandLayout={editor.rowExpandLayout}
            showActions={editor.expandableShowActions}
            previewItem={previewItem}
            title={t("entity.viewSettings.preview")}
            locale={i18n.language}
            getDefinition={getDefinition}
          />
        );
      case "card":
        return <DockedCardLayoutPreview enabled {...cardPreviewProps} />;
    }
  })();

  const structureTitle =
    editor.viewType === "table"
      ? t("designLayout.tableColumns")
      : structureLabels.structure;

  return (
    <div className="flex flex-col gap-6">
      <div
        key={
          editor.viewType === "table"
            ? `table-${editor.tableFields.join(",")}`
            : editor.viewType === "expandableTable"
              ? `expandable-${editor.expandableColumns.map((column) => column.id).join(",")}`
              : editor.viewType
        }
      >
        {listPreview}
      </div>

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

      <div className="flex flex-col gap-3">
        {editor.viewType !== "expandableTable" ? (
          <Text className="font-medium">{structureTitle}</Text>
        ) : null}
        {editor.viewType === "table" ? (
          <TableViewFieldsEditor
            definition={editor.definition}
            availableFields={editor.fieldPaths}
            selectedFields={editor.tableFields}
            onChange={editor.setTableFields}
            showActions={editor.tableShowActions}
            onShowActionsChange={editor.setTableShowActions}
          />
        ) : null}
        {editor.viewType === "expandableTable" ? (
          <CollapsibleSection
            title={t("designLayout.expandableTableColumns")}
            defaultOpen
          >
            <ExpandableTableColumnsEditor
              definition={editor.definition}
              availableFields={editor.fieldPaths}
              columns={editor.expandableColumns}
              onChange={editor.setExpandableColumns}
              showActions={editor.expandableShowActions}
              onShowActionsChange={editor.setExpandableShowActions}
              defaultFieldPath={editor.defaultFieldPath}
              structureLabels={structureLabels}
              getDefinition={getDefinition}
            />
          </CollapsibleSection>
        ) : null}
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
        {editor.viewType === "expandableTable" ? (
          <CollapsibleSection
            title={t("designLayout.expandableTableExpandRow")}
            defaultOpen
          >
            <EntityCardLayoutBuilder
              key={`expand-row-${editor.layoutEditorKey}`}
              layout={editor.rowExpandLayout}
              definition={editor.definition}
              defaultFieldPath={editor.defaultFieldPath}
              onLayoutChange={editor.setRowExpandLayout}
              labels={structureLabels}
              showStructureHeading={false}
              designSurface="tableRowExpand"
              getDefinition={getDefinition}
            />
          </CollapsibleSection>
        ) : null}
        {editor.viewType === "card" ? (
          <>
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
              key={`${editor.layoutEditorKey}-${editor.viewType}`}
              layout={editor.layout}
              definition={editor.definition}
              defaultFieldPath={editor.defaultFieldPath}
              onLayoutChange={editor.setLayout}
              labels={structureLabels}
              showStructureHeading={false}
              getDefinition={getDefinition}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
