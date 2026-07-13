import { useState } from "react";
import {
  addComponentRowAt,
  createDefaultComponent,
  insertGridRowAt,
  isGridComponent,
  isRowHolderComponent,
  moveRowAt,
  removeRowAt,
  replaceComponentRowAt,
  setGridTrackCount,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  updateGridRowMetaAt,
  type ComponentRowNode,
  type GridComponentConfig,
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
import type { LayoutColumnControlsLabels } from "./LayoutColumnControls.js";
import type { ColumnStackDirectionEditorLabels } from "./ColumnStackDirectionEditor.js";
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
import {
  LayoutVisibleWhenEditor,
  type LayoutVisibleWhenEditorLabels,
} from "./LayoutVisibleWhenEditor.js";
import type {
  CreateUiBuilderPresetInput,
  UiBuilderPresetRecord,
} from "@repo/entities";

export interface ColumnRowsEditorLabels extends LayoutColumnControlsLabels {
  readonly addRow: string;
  readonly componentRow: string;
  readonly gridRow: string;
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
  readonly visibleWhen?: LayoutVisibleWhenEditorLabels;
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

  const addGrid = () => {
    onLayoutChange(
      insertGridRowAt(layout, locator, { position: "after" }, { trackCount: 2 })
        .layout,
    );
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
              {row.type === "component" && isGridComponent(row.component)
                ? `Grid (${row.component.rows.length} tracks)`
                : `Component: ${row.component.kind}`}
            </button>
            <div className="flex flex-wrap gap-1">
              {definition && presetStore ? (
                <>
                  <InsertPresetDialog
                    kind="component-row"
                    designSurface={designSurface}
                    definition={definition}
                    fieldDescriptors={fieldDescriptors}
                    presets={presetStore.presets}
                    canApply={presetStore.canApplyPresets}
                    labels={presetStore.presetInsertLabels}
                    onApply={(data) => {
                      onLayoutChange(
                        replaceComponentRowAt(
                          layout,
                          locator,
                          row.id,
                          data as ComponentRowNode,
                        ),
                      );
                    }}
                  />
                  <SavePresetDialog
                    kind="component-row"
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
                    scope={{ type: "component-row" }}
                    data={row}
                    labels={labels.layoutJsonImport}
                  />
                  <LayoutJsonImportDialog
                    scope={{ type: "component-row" }}
                    designSurface={designSurface}
                    definition={definition}
                    defaultFieldPath={defaultFieldPath}
                    canApply={canApplyImport}
                    labels={labels.layoutJsonImport}
                    referenceData={row}
                    onApply={(data) => {
                      onLayoutChange(
                        replaceComponentRowAt(
                          layout,
                          locator,
                          row.id,
                          data as ComponentRowNode,
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
              {labels.visibleWhen ? (
                <LayoutVisibleWhenEditor
                  visibleWhen={row.visibleWhen}
                  labels={labels.visibleWhen}
                  onChange={(visibleWhen) =>
                    onLayoutChange(
                      updateComponentRowMetaAt(layout, locator, row.id, {
                        visibleWhen,
                      }),
                    )
                  }
                />
              ) : null}
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

          {expandedRowId === row.id &&
          row.type === "component" &&
          isGridComponent(row.component) ? (
            <GridRowEditor
              layout={layout}
              locator={locator}
              row={
                row as ComponentRowNode & {
                  readonly component: GridComponentConfig;
                }
              }
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
              onClick={addGrid}
            >
              {labels.gridRow}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function trackLocator(
  parentLocator: RowLocator,
  trackRowId: string,
): Extract<RowLocator, { scope: "container" }> {
  return {
    scope: "container",
    columnIndex: parentLocator.columnIndex,
    containerRowId: trackRowId,
  };
}

function GridRowEditor({
  layout,
  locator,
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
  readonly locator: RowLocator;
  readonly row: ComponentRowNode & { readonly component: GridComponentConfig };
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
  const grid = row.component;
  const [activeTrack, setActiveTrack] = useState(0);
  const clampedActiveTrack = Math.min(
    activeTrack,
    Math.max(0, grid.rows.length - 1),
  );
  const trackRow = grid.rows[clampedActiveTrack];

  return (
    <div className="flex flex-col gap-3 pl-2">
      <div className="flex flex-wrap items-center gap-2">
        {grid.rows.map((_, index) => (
          <Button
            key={index}
            type="button"
            variant={index === clampedActiveTrack ? "primary" : "outline"}
            onClick={() => setActiveTrack(index)}
          >
            Track {index + 1}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={grid.rows.length >= 6}
          onClick={() => {
            onLayoutChange(
              setGridTrackCount(layout, locator, row.id, grid.rows.length + 1),
            );
            setActiveTrack(grid.rows.length);
          }}
        >
          +
        </Button>
        {grid.rows.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onLayoutChange(
                setGridTrackCount(
                  layout,
                  locator,
                  row.id,
                  grid.rows.length - 1,
                ),
              );
              setActiveTrack((current) =>
                Math.min(current, grid.rows.length - 2),
              );
            }}
          >
            -
          </Button>
        ) : null}
      </div>

      <ComponentDisplayRangeEditor
        displayFrom={row.displayFrom}
        displayTo={row.displayTo}
        labels={labels.displayRange}
        onChange={(patch) =>
          onLayoutChange(updateGridRowMetaAt(layout, locator, row.id, patch))
        }
      />
      {labels.visibleWhen ? (
        <LayoutVisibleWhenEditor
          visibleWhen={row.visibleWhen}
          labels={labels.visibleWhen}
          onChange={(visibleWhen) =>
            onLayoutChange(
              updateGridRowMetaAt(layout, locator, row.id, {
                visibleWhen,
              }),
            )
          }
        />
      ) : null}

      {grid.rows.length >= 1 ? (
        <ResponsiveGridEditor
          styles={row.styles}
          columnCount={grid.rows.length}
          labels={labels.responsiveGrid}
          onChange={(styles) =>
            onLayoutChange(
              updateGridRowMetaAt(layout, locator, row.id, { styles }),
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
            updateGridRowMetaAt(layout, locator, row.id, {
              styles: [...genericStyles, ...gridStyles],
            }),
          );
        }}
        labels={{
          ...labels.styleRules,
          title: labels.rowLayoutStyles ?? labels.rowStyles,
        }}
      />

      {trackRow?.type === "component" &&
      isRowHolderComponent(trackRow.component) ? (
        <ColumnRowsEditor
          layout={layout}
          rootColumnIndex={rootColumnIndex}
          locator={trackLocator(locator, trackRow.id)}
          rows={trackRow.component.rows}
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
