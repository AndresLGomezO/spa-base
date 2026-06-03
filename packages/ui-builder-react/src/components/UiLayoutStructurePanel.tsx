import { useMemo, useState } from "react";
import {
  moveRootColumn,
  removeRootColumn,
  setRootColumnCount,
  setRootColumnWidthPercent,
  updateLayoutMeta,
  updateRootColumnStackDirection,
  updateRootColumnStyles,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  componentKindsForSurface,
  type DesignSurface,
} from "@repo/ui-builder-core";
import {
  entityCardViewAdapter,
  type EntityDefinitionLookup,
  type FieldDescriptor,
} from "../adapters/entity-card-view-adapter.js";
import { entityFormFieldAdapter } from "../adapters/entity-form-field-adapter.js";
import {
  ColumnRowsEditor,
  type ColumnRowsEditorLabels,
} from "./ColumnRowsEditor.js";
import type {
  ComponentConfigEditorLabels,
  ComponentConfigEditorProps,
} from "./ComponentConfigEditor.js";
import {
  LayoutColumnControls,
  type LayoutColumnControlsLabels,
} from "./LayoutColumnControls.js";
import {
  ColumnStackDirectionEditor,
  type ColumnStackDirectionEditorLabels,
} from "./ColumnStackDirectionEditor.js";
import {
  StyleRulesEditor,
  type StyleRulesEditorLabels,
} from "./StyleRulesEditor.js";

export interface UiLayoutStructurePanelLabels extends LayoutColumnControlsLabels {
  readonly structure: string;
  readonly showActions: string;
  readonly columnStyles: string;
  readonly stackDirection: ColumnStackDirectionEditorLabels;
  readonly styleRules: StyleRulesEditorLabels;
  readonly componentEditor: ComponentConfigEditorLabels;
  readonly addRow: string;
  readonly componentRow: string;
  readonly nestedRow: string;
  readonly emptyColumn: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly deleteRow: string;
}

export interface UiLayoutStructurePanelProps {
  readonly layout: UiLayoutDocument;
  readonly definition: SerializableEntityDefinition;
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: UiLayoutStructurePanelLabels;
  readonly className?: string;
  readonly metricKpiEditor?: ComponentConfigEditorProps["metricKpiEditor"];
  readonly staticImageEditor?: ComponentConfigEditorProps["staticImageEditor"];
  readonly showStructureHeading?: boolean;
  readonly showShowActionsControl?: boolean;
  readonly getDefinition?: EntityDefinitionLookup;
  readonly designSurface?: DesignSurface;
}

export function UiLayoutStructurePanel({
  layout,
  definition,
  defaultFieldPath,
  onLayoutChange,
  labels,
  className,
  metricKpiEditor,
  staticImageEditor,
  showStructureHeading = true,
  showShowActionsControl = true,
  getDefinition,
  designSurface = "listItem",
}: UiLayoutStructurePanelProps) {
  const allowedKinds = componentKindsForSurface(designSurface);
  const { fieldDescriptors } = useMemo(() => {
    if (designSurface === "formPlain" || designSurface === "formWizardStep") {
      return entityFormFieldAdapter(definition);
    }
    return entityCardViewAdapter(definition, getDefinition);
  }, [definition, designSurface, getDefinition]);

  const [activeColumn, setActiveColumn] = useState(0);

  const columnLabels: ColumnRowsEditorLabels = {
    layoutColumns: labels.layoutColumns,
    columnTab: labels.columnTab,
    columnWidthPercent: labels.columnWidthPercent,
    columnWidthAutoHint: labels.columnWidthAutoHint,
    moveColumnLeft: labels.moveColumnLeft,
    moveColumnRight: labels.moveColumnRight,
    deleteColumn: labels.deleteColumn,
    addRow: labels.addRow,
    componentRow: labels.componentRow,
    nestedRow: labels.nestedRow,
    emptyColumn: labels.emptyColumn,
    moveUp: labels.moveUp,
    moveDown: labels.moveDown,
    deleteRow: labels.deleteRow,
    columnStyles: labels.columnStyles,
    stackDirection: labels.stackDirection,
    styleRules: labels.styleRules,
    componentEditor: labels.componentEditor,
  };

  const activeColumnNode = layout.root.columns[activeColumn];

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      {showStructureHeading ? (
        <Text className="font-medium">{labels.structure}</Text>
      ) : null}

      <LayoutColumnControls
        columnCount={layout.root.columnCount}
        columns={layout.root.columns}
        activeColumn={activeColumn}
        labels={labels}
        onColumnCountChange={(count) => {
          onLayoutChange(setRootColumnCount(layout, count));
          setActiveColumn((current) =>
            Math.min(current, Math.max(0, count - 1)),
          );
        }}
        onActiveColumnChange={setActiveColumn}
        onColumnWidthPercentChange={(index, percent) =>
          onLayoutChange(setRootColumnWidthPercent(layout, index, percent))
        }
        onMoveLeft={() => {
          onLayoutChange(moveRootColumn(layout, activeColumn, -1));
          setActiveColumn((current) => Math.max(0, current - 1));
        }}
        onMoveRight={() => {
          onLayoutChange(moveRootColumn(layout, activeColumn, 1));
          setActiveColumn((current) =>
            Math.min(layout.root.columns.length - 1, current + 1),
          );
        }}
        onDelete={() => {
          onLayoutChange(removeRootColumn(layout, activeColumn));
          setActiveColumn((current) =>
            Math.min(layout.root.columns.length - 2, current),
          );
        }}
      />

      {showShowActionsControl ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={layout.showActions ?? true}
            onChange={(event) =>
              onLayoutChange(
                updateLayoutMeta(layout, { showActions: event.target.checked }),
              )
            }
          />
          <span>{labels.showActions}</span>
        </label>
      ) : null}

      {activeColumnNode ? (
        <ColumnStackDirectionEditor
          stackDirection={activeColumnNode.stackDirection}
          onChange={(stackDirection) =>
            onLayoutChange(
              updateRootColumnStackDirection(
                layout,
                activeColumn,
                stackDirection,
              ),
            )
          }
          labels={labels.stackDirection}
        />
      ) : null}

      {activeColumnNode ? (
        <StyleRulesEditor
          styles={activeColumnNode.styles}
          onChange={(styles) =>
            onLayoutChange(updateRootColumnStyles(layout, activeColumn, styles))
          }
          labels={{
            ...labels.styleRules,
            title: labels.columnStyles,
          }}
        />
      ) : null}

      {activeColumnNode ? (
        <ColumnRowsEditor
          layout={layout}
          locator={{ scope: "root", columnIndex: activeColumn }}
          rootColumnIndex={activeColumn}
          rows={activeColumnNode.rows}
          fieldDescriptors={fieldDescriptors}
          defaultFieldPath={defaultFieldPath}
          onLayoutChange={onLayoutChange}
          labels={columnLabels}
          metricKpiEditor={metricKpiEditor}
          staticImageEditor={staticImageEditor}
          allowedKinds={allowedKinds}
        />
      ) : null}
    </div>
  );
}

export type { FieldDescriptor };
