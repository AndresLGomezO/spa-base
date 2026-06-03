import { useState } from "react";
import {
  addComponentRowAt,
  addNestedLayoutRowAt,
  createDefaultComponent,
  moveNestedColumn,
  moveRowAt,
  removeNestedColumn,
  removeRowAt,
  setNestedColumnCount,
  updateComponentRowAt,
  updateNestedColumnStackDirection,
  updateNestedColumnStyles,
  type NestedLayoutRowNode,
  type RowLocator,
  type RowNode,
  type UiComponentConfig,
  type UiComponentKind,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import {
  ComponentConfigEditor,
  type ComponentConfigEditorLabels,
  type ComponentConfigEditorProps,
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

export interface ColumnRowsEditorLabels extends LayoutColumnControlsLabels {
  readonly addRow: string;
  readonly componentRow: string;
  readonly nestedRow: string;
  readonly emptyColumn: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly deleteRow: string;
  readonly columnStyles: string;
  readonly stackDirection: ColumnStackDirectionEditorLabels;
  readonly styleRules: StyleRulesEditorLabels;
  readonly componentEditor: ComponentConfigEditorLabels;
}

export interface ColumnRowsEditorProps {
  readonly layout: UiLayoutDocument;
  readonly locator: RowLocator;
  readonly rootColumnIndex: number;
  readonly rows: readonly RowNode[];
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: ColumnRowsEditorLabels;
  readonly metricKpiEditor?: ComponentConfigEditorProps["metricKpiEditor"];
  readonly allowedKinds?: readonly UiComponentKind[];
  readonly depth?: number;
}

export function ColumnRowsEditor({
  layout,
  locator,
  rootColumnIndex,
  rows,
  fieldDescriptors,
  defaultFieldPath,
  onLayoutChange,
  labels,
  metricKpiEditor,
  allowedKinds,
  depth = 0,
}: ColumnRowsEditorProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(
    rows[0]?.id ?? null,
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addComponent = () => {
    const component = createDefaultComponent("text", defaultFieldPath);
    onLayoutChange(addComponentRowAt(layout, locator, component));
    setShowAddMenu(false);
  };

  const addNested = () => {
    onLayoutChange(addNestedLayoutRowAt(layout, locator));
    setShowAddMenu(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {labels.emptyColumn}
        </Text>
      ) : null}

      {rows.map((row, rowIndex) => (
        <div key={row.id} className="border-border rounded-md border p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-left text-sm font-medium"
              onClick={() =>
                setExpandedRowId((current) =>
                  current === row.id ? null : row.id,
                )
              }
            >
              {row.type === "component"
                ? `Component: ${row.component.kind}`
                : `Nested layout (${row.columnCount} cols)`}
            </button>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                disabled={rowIndex === 0}
                onClick={() =>
                  onLayoutChange(moveRowAt(layout, locator, row.id, -1))
                }
              >
                {labels.moveUp}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={rowIndex === rows.length - 1}
                onClick={() =>
                  onLayoutChange(moveRowAt(layout, locator, row.id, 1))
                }
              >
                {labels.moveDown}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onLayoutChange(removeRowAt(layout, locator, row.id))
                }
              >
                {labels.deleteRow}
              </Button>
            </div>
          </div>

          {expandedRowId === row.id && row.type === "component" ? (
            <ComponentConfigEditor
              config={row.component}
              fieldDescriptors={fieldDescriptors}
              labels={labels.componentEditor}
              metricKpiEditor={metricKpiEditor}
              allowedKinds={allowedKinds}
              onChange={(component: UiComponentConfig) =>
                onLayoutChange(
                  updateComponentRowAt(layout, locator, row.id, component),
                )
              }
            />
          ) : null}

          {expandedRowId === row.id && row.type === "nested-layout" ? (
            <NestedLayoutRowEditor
              layout={layout}
              row={row}
              rootColumnIndex={rootColumnIndex}
              fieldDescriptors={fieldDescriptors}
              defaultFieldPath={defaultFieldPath}
              onLayoutChange={onLayoutChange}
              labels={labels}
              metricKpiEditor={metricKpiEditor}
              depth={depth}
            />
          ) : null}
        </div>
      ))}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddMenu((open) => !open)}
        >
          {labels.addRow}
        </Button>
        {showAddMenu ? (
          <div className="border-border bg-background absolute z-10 mt-1 flex flex-col rounded-md border p-1 shadow-md">
            <button
              type="button"
              className="rounded px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={addComponent}
            >
              {labels.componentRow}
            </button>
            <button
              type="button"
              className="rounded px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={addNested}
            >
              {labels.nestedRow}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NestedLayoutRowEditor({
  layout,
  row,
  rootColumnIndex,
  fieldDescriptors,
  defaultFieldPath,
  onLayoutChange,
  labels,
  metricKpiEditor,
  depth,
}: {
  readonly layout: UiLayoutDocument;
  readonly row: NestedLayoutRowNode;
  readonly rootColumnIndex: number;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: ColumnRowsEditorLabels;
  readonly metricKpiEditor?: ComponentConfigEditorProps["metricKpiEditor"];
  readonly depth: number;
}) {
  const [activeColumn, setActiveColumn] = useState(0);
  const clampedActiveColumn = Math.min(
    activeColumn,
    Math.max(0, row.columns.length - 1),
  );
  const activeColumnNode = row.columns[clampedActiveColumn];

  return (
    <div className="flex flex-col gap-3 pl-2">
      <LayoutColumnControls
        columnCount={row.columnCount}
        columns={row.columns}
        activeColumn={clampedActiveColumn}
        labels={labels}
        onColumnCountChange={(count) => {
          onLayoutChange(
            setNestedColumnCount(layout, rootColumnIndex, row.id, count),
          );
          setActiveColumn((current) =>
            Math.min(current, Math.max(0, count - 1)),
          );
        }}
        onActiveColumnChange={setActiveColumn}
        onMoveLeft={() => {
          onLayoutChange(
            moveNestedColumn(
              layout,
              rootColumnIndex,
              row.id,
              clampedActiveColumn,
              -1,
            ),
          );
          setActiveColumn((current) => Math.max(0, current - 1));
        }}
        onMoveRight={() => {
          onLayoutChange(
            moveNestedColumn(
              layout,
              rootColumnIndex,
              row.id,
              clampedActiveColumn,
              1,
            ),
          );
          setActiveColumn((current) =>
            Math.min(row.columns.length - 1, current + 1),
          );
        }}
        onDelete={() => {
          onLayoutChange(
            removeNestedColumn(
              layout,
              rootColumnIndex,
              row.id,
              clampedActiveColumn,
            ),
          );
          setActiveColumn((current) =>
            Math.min(row.columns.length - 2, current),
          );
        }}
      />

      {activeColumnNode ? (
        <ColumnStackDirectionEditor
          stackDirection={activeColumnNode.stackDirection}
          onChange={(stackDirection) =>
            onLayoutChange(
              updateNestedColumnStackDirection(
                layout,
                rootColumnIndex,
                row.id,
                clampedActiveColumn,
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
            onLayoutChange(
              updateNestedColumnStyles(
                layout,
                rootColumnIndex,
                row.id,
                clampedActiveColumn,
                styles,
              ),
            )
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
          rootColumnIndex={rootColumnIndex}
          locator={{
            scope: "nested",
            columnIndex: rootColumnIndex,
            rowId: row.id,
            nestedColumnIndex: clampedActiveColumn,
          }}
          rows={activeColumnNode.rows}
          fieldDescriptors={fieldDescriptors}
          defaultFieldPath={defaultFieldPath}
          onLayoutChange={onLayoutChange}
          labels={labels}
          metricKpiEditor={metricKpiEditor}
          depth={depth + 1}
        />
      ) : null}
    </div>
  );
}
