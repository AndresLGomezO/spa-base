import { useMemo, useState } from "react";
import {
  moveRootColumn,
  removeRootColumn,
  replaceLayoutDocument,
  insertColumnAt,
  setRootColumnCount,
  setRootColumnWidthPercent,
  updateLayoutMeta,
  updateRootColumnStackDirection,
  type MotionPreset,
  updateRootColumnStyles,
  updateRootNodeStyles,
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
import {
  entityFormFieldAdapter,
  entityFieldSelectorFieldAdapter,
} from "../adapters/entity-form-field-adapter.js";
import { CollapsibleSection } from "./CollapsibleSection.js";
import {
  ColumnRowsEditor,
  type ColumnRowsEditorLabels,
} from "./ColumnRowsEditor.js";
import type {
  ComponentConfigEditorLabels,
  ComponentConfigEditorProps,
} from "./ComponentConfigEditor.js";
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
import type {
  CreateUiBuilderPresetInput,
  UiBuilderPresetRecord,
} from "@repo/entities";
import type { ColumnNode } from "@repo/ui-builder-core";
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
  ResponsiveGridEditor,
  type ResponsiveGridEditorLabels,
} from "./ResponsiveGridEditor.js";
import type { ComponentDisplayRangeEditorLabels } from "./ComponentDisplayRangeEditor.js";
import {
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "./responsive-grid-state.js";

export interface UiLayoutStructurePanelLabels extends LayoutColumnControlsLabels {
  readonly structure: string;
  readonly showActions: string;
  readonly columnStyles: string;
  readonly stackDirection: ColumnStackDirectionEditorLabels;
  readonly styleRules: StyleRulesEditorLabels;
  readonly motion?: MotionPresetEditorLabels;
  readonly layoutEffects?: string;
  readonly rowStyles?: string;
  readonly rowLayoutStyles?: string;
  readonly responsiveGrid: ResponsiveGridEditorLabels;
  readonly displayRange: ComponentDisplayRangeEditorLabels;
  readonly rowEffects?: string;
  readonly componentEditor: ComponentConfigEditorLabels;
  readonly addRow: string;
  readonly componentRow: string;
  readonly nestedRow: string;
  readonly emptyColumn: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly deleteRow: string;
  readonly layoutJsonImport: LayoutJsonImportLabels;
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
  readonly lucideIconEditor?: ComponentConfigEditorProps["lucideIconEditor"];
  readonly showStructureHeading?: boolean;
  readonly showShowActionsControl?: boolean;
  readonly getDefinition?: EntityDefinitionLookup;
  readonly designSurface?: DesignSurface;
  readonly canApplyImport?: boolean;
  /** When true, formWizardShell imports may omit wizard-actions (actions in modal footer). */
  readonly actionsInModalFooter?: boolean;
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

export function UiLayoutStructurePanel({
  layout,
  definition,
  defaultFieldPath,
  onLayoutChange,
  labels,
  className,
  metricKpiEditor,
  staticImageEditor,
  lucideIconEditor,
  showStructureHeading = true,
  showShowActionsControl = true,
  getDefinition,
  designSurface = "listItem",
  canApplyImport = false,
  actionsInModalFooter = false,
  presetStore,
}: UiLayoutStructurePanelProps) {
  const allowedKinds = componentKindsForSurface(designSurface);
  const { fieldDescriptors: formFieldDescriptors } = useMemo(() => {
    if (designSurface === "formPlain" || designSurface === "formWizardStep") {
      return entityFormFieldAdapter(definition);
    }
    return entityCardViewAdapter(definition, getDefinition);
  }, [definition, designSurface, getDefinition]);

  const displayFieldDescriptors = useMemo((): readonly FieldDescriptor[] => {
    if (designSurface === "formWizardStep") {
      return entityCardViewAdapter(definition, getDefinition).fieldDescriptors;
    }
    return formFieldDescriptors;
  }, [definition, designSurface, formFieldDescriptors, getDefinition]);

  const fieldDescriptors = formFieldDescriptors;

  const entityFieldSelectorFieldDescriptors = useMemo(() => {
    if (designSurface !== "formPlain" && designSurface !== "formWizardStep") {
      return undefined;
    }
    return entityFieldSelectorFieldAdapter(definition).fieldDescriptors;
  }, [definition, designSurface]);

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
    motion: labels.motion,
    rowStyles: labels.rowStyles,
    rowLayoutStyles: labels.rowLayoutStyles,
    responsiveGrid: labels.responsiveGrid,
    displayRange: labels.displayRange,
    rowEffects: labels.rowEffects,
    componentEditor: labels.componentEditor,
    layoutJsonImport: labels.layoutJsonImport,
  };

  const activeColumnNode = layout.root.columns[activeColumn];

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div className="flex items-center justify-between gap-2">
        {showStructureHeading ? (
          <Text className="font-medium">{labels.structure}</Text>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {presetStore ? (
            <>
              <InsertPresetDialog
                kind="layout-document"
                designSurface={designSurface}
                definition={definition}
                fieldDescriptors={fieldDescriptors}
                presets={presetStore.presets}
                canApply={presetStore.canApplyPresets}
                labels={presetStore.presetInsertLabels}
                onApply={(data) =>
                  onLayoutChange(
                    replaceLayoutDocument(data as UiLayoutDocument),
                  )
                }
                actionsInModalFooter={actionsInModalFooter}
              />
              <SavePresetDialog
                kind="layout-document"
                node={layout}
                designSurface={designSurface}
                sourceEntityName={presetStore.sourceEntityName}
                canSave={presetStore.canApplyPresets}
                labels={presetStore.presetLabels}
                onSave={presetStore.onCreatePreset}
              />
            </>
          ) : null}
          <LayoutJsonViewDialog
            scope={{ type: "layout-document" }}
            data={layout}
            labels={labels.layoutJsonImport}
          />
          <LayoutJsonImportDialog
            scope={{ type: "layout-document" }}
            designSurface={designSurface}
            definition={definition}
            defaultFieldPath={defaultFieldPath}
            canApply={canApplyImport}
            labels={labels.layoutJsonImport}
            referenceData={layout}
            actionsInModalFooter={actionsInModalFooter}
            onApply={(data) =>
              onLayoutChange(replaceLayoutDocument(data as UiLayoutDocument))
            }
          />
        </div>
      </div>

      {presetStore && activeColumnNode ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <InsertPresetDialog
            kind="column"
            designSurface={designSurface}
            definition={definition}
            fieldDescriptors={fieldDescriptors}
            presets={presetStore.presets}
            canApply={presetStore.canApplyPresets}
            labels={presetStore.presetInsertLabels}
            onApply={(data) =>
              onLayoutChange(
                insertColumnAt(layout, activeColumn + 1, data as ColumnNode),
              )
            }
          />
          <SavePresetDialog
            kind="column"
            node={activeColumnNode}
            designSurface={designSurface}
            sourceEntityName={presetStore.sourceEntityName}
            canSave={presetStore.canApplyPresets}
            labels={presetStore.presetLabels}
            onSave={presetStore.onCreatePreset}
          />
        </div>
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

      {layout.root.columnCount >= 1 ? (
        <ResponsiveGridEditor
          styles={layout.root.styles}
          columnCount={layout.root.columnCount}
          labels={labels.responsiveGrid}
          onChange={(styles) =>
            onLayoutChange(updateRootNodeStyles(layout, styles))
          }
        />
      ) : null}

      <StyleRulesEditor
        styles={filterStyleRulesForGenericEditor(layout.root.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (layout.root.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          onLayoutChange(
            updateRootNodeStyles(layout, [...genericStyles, ...gridStyles]),
          );
        }}
        labels={{
          ...labels.styleRules,
          title: labels.rowLayoutStyles ?? labels.styleRules.title,
        }}
      />

      {labels.motion ? (
        <CollapsibleSection title={labels.layoutEffects} defaultOpen={false}>
          <MotionPresetEditor
            motion={layout.motion}
            onChange={(motion: MotionPreset | undefined) =>
              onLayoutChange(updateLayoutMeta(layout, { motion }))
            }
            labels={labels.motion}
          />
        </CollapsibleSection>
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
          displayFieldDescriptors={displayFieldDescriptors}
          defaultFieldPath={defaultFieldPath}
          onLayoutChange={onLayoutChange}
          labels={columnLabels}
          metricKpiEditor={metricKpiEditor}
          staticImageEditor={staticImageEditor}
          lucideIconEditor={lucideIconEditor}
          allowedKinds={allowedKinds}
          canApplyImport={canApplyImport}
          designSurface={designSurface}
          definition={definition}
          getDefinition={getDefinition}
          entityFieldSelectorFieldDescriptors={
            entityFieldSelectorFieldDescriptors
          }
          presetStore={presetStore}
        />
      ) : null}
    </div>
  );
}

export type { FieldDescriptor };
