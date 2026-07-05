import { useMemo } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ColumnStackDirectionEditor,
  ComponentDisplayRangeEditor,
  ResponsiveGridEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import {
  resolveColumnWidthPercentInput,
  resolveColumnWidthPercents,
  resolveMaxColumnWidthPercent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { FieldLabel, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import { isNestedComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import { toComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import {
  findColumnByRef,
  applyComponentsColumnPatch,
  resolveGridTrackCount,
} from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { StructureColumnNameField } from "../form-designer/StructureItemNameField";
import { resolveActiveLayoutBinding } from "./metrics-row-designer-layout-binding";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";

interface MetricsRowDesignerComponentColumnPanelProps {
  readonly columnRef: ComponentColumnRef;
}

export function MetricsRowDesignerComponentColumnPanel({
  columnRef,
}: MetricsRowDesignerComponentColumnPanelProps) {
  const { t } = useTranslation("common");
  const { editor, activeTabId } = useMetricsRowDesigner();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, activeTabId),
    [activeTabId, editor],
  );

  const labels = useFormDesignerLayoutEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);
  const resolved = findColumnByRef(binding.layout, columnRef);

  if (!resolved) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formDesigner.layout.columnPanel.missingColumn")}
      </Text>
    );
  }

  const { column, siblingColumns, parentGridRow } = resolved;
  const columnCount = siblingColumns.length;
  const columnIndex = isNestedComponentColumnRef(columnRef)
    ? columnRef.nestedColumnIndex
    : columnRef.rootColumnIndex;

  const resolvedPercents = resolveColumnWidthPercents(siblingColumns);
  const resolvedPercent = resolvedPercents[columnIndex];
  const maxWidthPercent = resolveMaxColumnWidthPercent(
    siblingColumns,
    columnIndex,
  );
  const isAuto = column.widthPercent === undefined;

  const applyColumnPatch = (
    patch: Parameters<typeof binding.updateRootColumn>[1],
  ) => {
    applyComponentsColumnPatch(binding, columnRef, parentGridRow, patch);
  };

  const stackEditor = (
    <ColumnStackDirectionEditor
      stackDirection={column.stackDirection}
      onChange={(stackDirection) => applyColumnPatch({ stackDirection })}
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
      onChange={(patch) => applyColumnPatch(patch)}
    />
  );

  const rowLayoutStyles = parentGridRow
    ? filterStyleRulesForGenericEditor(parentGridRow.styles)
    : filterStyleRulesForGenericEditor(binding.layout.root.styles);

  const rowLayoutGridStyles = parentGridRow
    ? (parentGridRow.styles ?? []).filter((rule) =>
        isResponsiveGridStyleProperty(rule.property),
      )
    : (binding.layout.root.styles ?? []).filter((rule) =>
        isResponsiveGridStyleProperty(rule.property),
      );

  const updateRowLayoutStyles = (
    genericStyles: readonly import("@repo/ui-builder-core").StyleRule[],
  ) => {
    const nextStyles = [...genericStyles, ...rowLayoutGridStyles];
    if (parentGridRow && isNestedComponentColumnRef(columnRef)) {
      binding.updateGridRowMeta(
        toComponentRowRef(columnRef.nestedParentRowId, {
          scope: "root",
          columnIndex: columnRef.rootColumnIndex,
        }),
        { styles: nextStyles },
      );
      return;
    }

    binding.updateRootLayoutStyles(nextStyles);
  };

  const updateResponsiveGrid = (
    styles: readonly import("@repo/ui-builder-core").StyleRule[],
  ) => {
    if (!parentGridRow || !isNestedComponentColumnRef(columnRef)) {
      return;
    }

    binding.updateGridRowMeta(
      toComponentRowRef(columnRef.nestedParentRowId, {
        scope: "root",
        columnIndex: columnRef.rootColumnIndex,
      }),
      { styles },
    );
  };

  const columnNameField = (
    <StructureColumnNameField
      id={`component-column-name-${column.id}`}
      column={column}
      columnIndex={columnRef.rootColumnIndex}
      nestedColumnIndex={
        isNestedComponentColumnRef(columnRef)
          ? columnRef.nestedColumnIndex
          : undefined
      }
      treeLabels={treeLabels}
      onChange={(name) => applyColumnPatch({ name })}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {columnCount > 1 ? (
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
                  applyColumnPatch({ widthPercent: undefined });
                  return;
                }
                const percent = Number.parseInt(raw, 10);
                if (!Number.isFinite(percent)) {
                  return;
                }
                applyColumnPatch({
                  widthPercent: resolveColumnWidthPercentInput(
                    siblingColumns,
                    columnIndex,
                    percent,
                  ),
                });
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

      {parentGridRow ? (
        <ResponsiveGridEditor
          styles={parentGridRow.styles}
          columnCount={resolveGridTrackCount(parentGridRow) ?? 1}
          labels={labels.responsiveGrid}
          onChange={updateResponsiveGrid}
        />
      ) : null}

      <CollapsibleStyleRulesEditor
        title={labels.columnStyles}
        styles={column.styles}
        onChange={(styles) => applyColumnPatch({ styles })}
        labels={labels.styleRules}
      />

      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={rowLayoutStyles}
        onChange={updateRowLayoutStyles}
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.layoutEffects}
        motion={binding.layout.motion}
        onChange={(motion: MotionPreset | undefined) =>
          binding.updateLayoutMotion(motion)
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
