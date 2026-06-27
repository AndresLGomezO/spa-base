import { useMemo } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ColumnStackDirectionEditor,
  ComponentDisplayRangeEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import {
  resolveColumnWidthPercentInput,
  resolveColumnWidthPercents,
  resolveMaxColumnWidthPercent,
  setRootColumnWidthPercent,
  updateLayoutMeta,
  updateRootColumnDisplayRange,
  updateRootColumnMetaAt,
  updateRootColumnStackDirection,
  updateRootColumnStyles,
  updateRootNodeStyles,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { FieldLabel, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { useFormDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import { getFormDesignerOuterLayout } from "./form-designer-layout";
import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import { StructureColumnNameField } from "./StructureItemNameField";
import { useFormDesigner } from "./form-designer-context";

interface FormDesignerLayoutColumnPanelProps {
  readonly columnIndex: number;
}

export function FormDesignerLayoutColumnPanel({
  columnIndex,
}: FormDesignerLayoutColumnPanelProps) {
  const { t } = useTranslation("common");
  const { editor } = useFormDesigner();
  const { layout, setLayout } = getFormDesignerOuterLayout(editor);
  const labels = useFormDesignerLayoutEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);

  const column = layout.root.columns[columnIndex];

  if (!column) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formDesigner.layout.columnPanel.missingColumn")}
      </Text>
    );
  }

  const resolvedPercents = resolveColumnWidthPercents(layout.root.columns);
  const resolvedPercent = resolvedPercents[columnIndex];
  const maxWidthPercent = resolveMaxColumnWidthPercent(
    layout.root.columns,
    columnIndex,
  );
  const isAuto = column.widthPercent === undefined;

  const stackEditor = (
    <ColumnStackDirectionEditor
      stackDirection={column.stackDirection}
      onChange={(stackDirection) =>
        setLayout(
          updateRootColumnStackDirection(layout, columnIndex, stackDirection),
        )
      }
      labels={labels.stackDirection}
      className="min-w-[12rem] flex-1"
    />
  );

  const visibilityEditor = (
    <ComponentDisplayRangeEditor
      displayFrom={column.displayFrom}
      displayTo={column.displayTo}
      labels={labels.displayRange}
      variant="inline"
      onChange={(patch) =>
        setLayout(updateRootColumnDisplayRange(layout, columnIndex, patch))
      }
    />
  );

  const columnNameField = (
    <StructureColumnNameField
      id={`layout-column-name-${column.id}`}
      column={column}
      columnIndex={columnIndex}
      treeLabels={treeLabels}
      onChange={(name) =>
        setLayout(updateRootColumnMetaAt(layout, columnIndex, { name }))
      }
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {layout.root.columnCount > 1 ? (
        <FormDesignerPanelPrimaryControls>
          {columnNameField}
          <div className="flex w-24 flex-col gap-1 text-sm">
            <FieldLabel>{labels.columnWidthPercent}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={maxWidthPercent}
              placeholder="auto"
              value={column.widthPercent ?? ""}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw === "") {
                  setLayout(
                    setRootColumnWidthPercent(layout, columnIndex, undefined),
                  );
                  return;
                }
                const percent = Number.parseInt(raw, 10);
                if (!Number.isFinite(percent)) {
                  return;
                }
                setLayout(
                  setRootColumnWidthPercent(
                    layout,
                    columnIndex,
                    resolveColumnWidthPercentInput(
                      layout.root.columns,
                      columnIndex,
                      percent,
                    ),
                  ),
                );
              }}
            />
            {resolvedPercent !== undefined ? (
              <Text variant="muted" className="text-xs">
                {isAuto
                  ? labels.columnWidthAutoHint(resolvedPercent)
                  : `${resolvedPercent}%`}
              </Text>
            ) : null}
          </div>
          {stackEditor}
          {visibilityEditor}
        </FormDesignerPanelPrimaryControls>
      ) : (
        <FormDesignerPanelPrimaryControls>
          {columnNameField}
          {stackEditor}
          {visibilityEditor}
        </FormDesignerPanelPrimaryControls>
      )}

      <CollapsibleStyleRulesEditor
        title={labels.columnStyles}
        styles={column.styles}
        onChange={(styles) =>
          setLayout(updateRootColumnStyles(layout, columnIndex, styles))
        }
        labels={labels.styleRules}
      />

      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={filterStyleRulesForGenericEditor(layout.root.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (layout.root.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          setLayout(
            updateRootNodeStyles(layout, [...genericStyles, ...gridStyles]),
          );
        }}
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.layoutEffects}
        motion={layout.motion}
        onChange={(motion: MotionPreset | undefined) =>
          setLayout(updateLayoutMeta(layout, { motion }))
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
