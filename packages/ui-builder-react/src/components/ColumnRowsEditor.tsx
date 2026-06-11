import { useState } from "react";
import {
  addComponentRowAt,
  addNestedLayoutRowAt,
  createDefaultComponent,
  moveNestedColumn,
  moveRowAt,
  removeNestedColumn,
  removeRowAt,
  replaceComponentRowAt,
  replaceNestedLayoutRowAt,
  setNestedColumnCount,
  setNestedColumnWidthPercent,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  updateNestedColumnStackDirection,
  updateNestedColumnStyles,
  updateNestedLayoutRowStyles,
  updateNestedLayoutRowDisplayRange,
  type NestedLayoutRowNode,
  type ComponentRowNode,
  type RowLocator,
  type RowNode,
  type UiComponentConfig,
  type UiComponentKind,
  type UiLayoutDocument,
  type DesignSurface,
} from "@repo/ui-builder-core";
import { Button, Text } from "@repo/ui";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { CollapsibleSection } from "./CollapsibleSection.js";
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
  MotionPresetEditor,
  type MotionPresetEditorLabels,
} from "./MotionPresetEditor.js";
import {
  StyleRulesEditor,
  type StyleRulesEditorLabels,
} from "./StyleRulesEditor.js";
import {
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "./responsive-grid-state.js";
import {
  LayoutJsonImportDialog,
  type LayoutJsonImportLabels,
} from "./LayoutJsonImportDialog.js";
import { LayoutJsonViewDialog } from "./LayoutJsonViewDialog.js";
import {
  SavePresetDialog,
  type LayoutPresetLabels,
} from "./SavePresetDialog.js";
import {
  InsertPresetDialog,
  type LayoutPresetInsertLabels,
} from "./InsertPresetDialog.js";
import {
  ResponsiveGridEditor,
  type ResponsiveGridEditorLabels,
} from "./ResponsiveGridEditor.js";
import {
  ComponentDisplayRangeEditor,
  type ComponentDisplayRangeEditorLabels,
} from "./ComponentDisplayRangeEditor.js";
import type {
  CreateUiBuilderPresetInput,
  UiBuilderPresetRecord,
} from "@repo/entities";

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
  readonly motion?: MotionPresetEditorLabels;
  readonly rowStyles?: string;
  readonly rowEffects?: string;
  readonly rowLayoutStyles?: string;
  readonly responsiveGrid: ResponsiveGridEditorLabels;
  readonly displayRange: ComponentDisplayRangeEditorLabels;
  readonly componentEditor: ComponentConfigEditorLabels;
  readonly layoutJsonImport: LayoutJsonImportLabels;
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
  readonly staticImageEditor?: ComponentConfigEditorProps["staticImageEditor"];
  readonly lucideIconEditor?: ComponentConfigEditorProps["lucideIconEditor"];
  readonly allowedKinds?: readonly UiComponentKind[];
  readonly depth?: number;
  readonly canApplyImport?: boolean;
  readonly designSurface?: DesignSurface;
  readonly definition?: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => SerializableEntityDefinition | undefined;
  readonly entityFieldSelectorFieldDescriptors?: readonly FieldDescriptor[];
  readonly displayFieldDescriptors?: readonly FieldDescriptor[];
  readonly presetStore?: {
    readonly presets: readonly UiBuilderPresetRecord[];
    readonly canApplyPresets: boolean;
    readonly presetLabels: LayoutPresetLabels;
    readonly presetInsertLabels: LayoutPresetInsertLabels;
    readonly onCreatePreset: (
      input: CreateUiBuilderPresetInput,
    ) => Promise<void>;
    readonly sourceEntityName?: string;
  };
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
  staticImageEditor,
  lucideIconEditor,
  allowedKinds,
  depth = 0,
  canApplyImport = false,
  designSurface = "listItem",
  definition,
  getDefinition,
  entityFieldSelectorFieldDescriptors,
  displayFieldDescriptors,
  presetStore,
}: ColumnRowsEditorProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(
    rows[0]?.id ?? null,
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addComponent = () => {
    const defaultKind = allowedKinds?.[0] ?? "text";
    const component = createDefaultComponent(defaultKind, defaultFieldPath);
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
            <div className="flex flex-wrap gap-1">
              {definition && presetStore ? (
                <>
                  <InsertPresetDialog
                    kind={
                      row.type === "component"
                        ? "component-row"
                        : "nested-layout-row"
                    }
                    designSurface={designSurface}
                    definition={definition}
                    fieldDescriptors={fieldDescriptors}
                    presets={presetStore.presets}
                    canApply={presetStore.canApplyPresets}
                    labels={presetStore.presetInsertLabels}
                    onApply={(data) => {
                      if (row.type === "component") {
                        onLayoutChange(
                          replaceComponentRowAt(
                            layout,
                            locator,
                            row.id,
                            data as ComponentRowNode,
                          ),
                        );
                        return;
                      }
                      onLayoutChange(
                        replaceNestedLayoutRowAt(
                          layout,
                          row.id,
                          data as NestedLayoutRowNode,
                        ),
                      );
                    }}
                  />
                  <SavePresetDialog
                    kind={
                      row.type === "component"
                        ? "component-row"
                        : "nested-layout-row"
                    }
                    node={row}
                    designSurface={designSurface}
                    sourceEntityName={presetStore.sourceEntityName}
                    canSave={presetStore.canApplyPresets}
                    labels={presetStore.presetLabels}
                    onSave={presetStore.onCreatePreset}
                  />
                </>
              ) : null}
              {definition ? (
                <>
                  <LayoutJsonViewDialog
                    scope={{
                      type:
                        row.type === "component"
                          ? "component-row"
                          : "nested-layout-row",
                    }}
                    data={row}
                    labels={labels.layoutJsonImport}
                  />
                  <LayoutJsonImportDialog
                    scope={{
                      type:
                        row.type === "component"
                          ? "component-row"
                          : "nested-layout-row",
                    }}
                    designSurface={designSurface}
                    definition={definition}
                    defaultFieldPath={defaultFieldPath}
                    canApply={canApplyImport}
                    labels={labels.layoutJsonImport}
                    referenceData={row}
                    onApply={(data) => {
                      if (row.type === "component") {
                        onLayoutChange(
                          replaceComponentRowAt(
                            layout,
                            locator,
                            row.id,
                            data as ComponentRowNode,
                          ),
                        );
                        return;
                      }
                      onLayoutChange(
                        replaceNestedLayoutRowAt(
                          layout,
                          row.id,
                          data as NestedLayoutRowNode,
                        ),
                      );
                    }}
                  />
                </>
              ) : null}
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
            <div className="flex flex-col gap-3">
              <ComponentConfigEditor
                config={row.component}
                fieldDescriptors={fieldDescriptors}
                labels={labels.componentEditor}
                metricKpiEditor={metricKpiEditor}
                staticImageEditor={staticImageEditor}
                lucideIconEditor={lucideIconEditor}
                allowedKinds={allowedKinds}
                definition={definition}
                getDefinition={getDefinition}
                entityFieldSelectorFieldDescriptors={
                  entityFieldSelectorFieldDescriptors
                }
                displayFieldDescriptors={displayFieldDescriptors}
                onChange={(component: UiComponentConfig) =>
                  onLayoutChange(
                    updateComponentRowAt(layout, locator, row.id, component),
                  )
                }
              />
              <ComponentDisplayRangeEditor
                displayFrom={row.displayFrom}
                displayTo={row.displayTo}
                labels={labels.displayRange}
                onChange={(patch) =>
                  onLayoutChange(
                    updateComponentRowMetaAt(layout, locator, row.id, patch),
                  )
                }
              />
              {labels.motion ? (
                <CollapsibleSection
                  title={labels.rowEffects}
                  defaultOpen={false}
                >
                  <MotionPresetEditor
                    motion={row.motion}
                    onChange={(motion) =>
                      onLayoutChange(
                        updateComponentRowMetaAt(layout, locator, row.id, {
                          motion,
                        }),
                      )
                    }
                    labels={labels.motion}
                  />
                </CollapsibleSection>
              ) : null}
              <StyleRulesEditor
                styles={row.styles}
                onChange={(styles) =>
                  onLayoutChange(
                    updateComponentRowMetaAt(layout, locator, row.id, {
                      styles,
                    }),
                  )
                }
                labels={{
                  ...labels.styleRules,
                  title: labels.rowStyles,
                }}
              />
            </div>
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
              staticImageEditor={staticImageEditor}
              lucideIconEditor={lucideIconEditor}
              allowedKinds={allowedKinds}
              depth={depth}
              canApplyImport={canApplyImport}
              designSurface={designSurface}
              definition={definition}
              getDefinition={getDefinition}
              entityFieldSelectorFieldDescriptors={
                entityFieldSelectorFieldDescriptors
              }
              displayFieldDescriptors={displayFieldDescriptors}
              presetStore={presetStore}
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
  staticImageEditor,
  lucideIconEditor,
  allowedKinds,
  depth,
  canApplyImport = false,
  designSurface = "listItem",
  definition,
  getDefinition,
  entityFieldSelectorFieldDescriptors,
  displayFieldDescriptors,
  presetStore,
}: {
  readonly layout: UiLayoutDocument;
  readonly row: NestedLayoutRowNode;
  readonly rootColumnIndex: number;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: ColumnRowsEditorLabels;
  readonly metricKpiEditor?: ComponentConfigEditorProps["metricKpiEditor"];
  readonly staticImageEditor?: ComponentConfigEditorProps["staticImageEditor"];
  readonly lucideIconEditor?: ComponentConfigEditorProps["lucideIconEditor"];
  readonly allowedKinds?: readonly UiComponentKind[];
  readonly depth: number;
  readonly canApplyImport?: boolean;
  readonly designSurface?: DesignSurface;
  readonly definition?: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => SerializableEntityDefinition | undefined;
  readonly entityFieldSelectorFieldDescriptors?: readonly FieldDescriptor[];
  readonly displayFieldDescriptors?: readonly FieldDescriptor[];
  readonly presetStore?: ColumnRowsEditorProps["presetStore"];
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
        onColumnWidthPercentChange={(index, percent) =>
          onLayoutChange(
            setNestedColumnWidthPercent(
              layout,
              rootColumnIndex,
              row.id,
              index,
              percent,
            ),
          )
        }
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

      <ComponentDisplayRangeEditor
        displayFrom={row.displayFrom}
        displayTo={row.displayTo}
        labels={labels.displayRange}
        onChange={(patch) =>
          onLayoutChange(
            updateNestedLayoutRowDisplayRange(
              layout,
              rootColumnIndex,
              row.id,
              patch,
            ),
          )
        }
      />

      {row.columnCount >= 1 ? (
        <ResponsiveGridEditor
          styles={row.styles}
          columnCount={row.columnCount}
          labels={labels.responsiveGrid}
          onChange={(styles) =>
            onLayoutChange(
              updateNestedLayoutRowStyles(
                layout,
                rootColumnIndex,
                row.id,
                styles,
              ),
            )
          }
        />
      ) : null}

      <StyleRulesEditor
        styles={filterStyleRulesForGenericEditor(row.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (row.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          onLayoutChange(
            updateNestedLayoutRowStyles(layout, rootColumnIndex, row.id, [
              ...genericStyles,
              ...gridStyles,
            ]),
          );
        }}
        labels={{
          ...labels.styleRules,
          title: labels.rowLayoutStyles ?? labels.rowStyles,
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
          staticImageEditor={staticImageEditor}
          lucideIconEditor={lucideIconEditor}
          allowedKinds={allowedKinds}
          depth={depth + 1}
          canApplyImport={canApplyImport}
          designSurface={designSurface}
          definition={definition}
          getDefinition={getDefinition}
          entityFieldSelectorFieldDescriptors={
            entityFieldSelectorFieldDescriptors
          }
          displayFieldDescriptors={displayFieldDescriptors}
          presetStore={presetStore}
        />
      ) : null}
    </div>
  );
}
