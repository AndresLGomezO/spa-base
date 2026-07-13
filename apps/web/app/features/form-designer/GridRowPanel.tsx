import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentDisplayRangeEditor,
  LayoutVisibleWhenEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  analyzeGridTemplateColumns,
  countDefinedGridTemplateTracks,
  MAX_NESTED_COLUMNS,
  readGridGapEditorValue,
  stripGapStyleRules,
  updateComponentRowAt,
  updateGridRowMetaAt,
  type ComponentRowNode,
  type DesignSurface,
  type GridComponentConfig,
  type StyleRule,
} from "@repo/ui-builder-core";
import { PreservedTextInput } from "@repo/ui-builder-react";
import { FieldError, FieldLabel, Text } from "@repo/ui";
import { useMemo } from "react";

import { ComponentRowConditionalStylesPanelSection } from "../ui-builder/ComponentRowConditionalStylesPanelSection.js";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsLayoutBinding } from "./form-designer-components-layout";
import type { formDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import { GridTemplateColumnsFieldLabel } from "./GridTemplateColumnsFieldHelp";
import { StructureRowNameField } from "./StructureItemNameField";
import type { StructureTreeLabels } from "./form-designer-structure-tree";

interface GridRowPanelProps {
  readonly row: GridComponentConfig;
  readonly rowNode: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly definition: SerializableEntityDefinition;
  readonly designSurface: DesignSurface;
  readonly labels: ReturnType<typeof formDesignerLayoutEditorLabels>;
  readonly treeLabels: StructureTreeLabels;
  readonly fieldDescriptors: readonly FieldDescriptor[];
}

function readGridShellStyleRules(
  row: GridComponentConfig,
  rowNode: ComponentRowNode,
): readonly StyleRule[] {
  const legacyRowShellStyles = (rowNode.styles ?? []).filter(
    (rule) => !isResponsiveGridStyleProperty(rule.property),
  );
  const byProperty = new Map<string, StyleRule>(
    [...legacyRowShellStyles, ...(row.styles ?? [])].map((rule) => [
      rule.property,
      rule,
    ]),
  );

  return stripGapStyleRules(
    filterStyleRulesForGenericEditor([...byProperty.values()]),
  );
}

function writeGridShellStyleRules(
  binding: ComponentsLayoutBinding,
  rowRef: ComponentRowRef,
  row: GridComponentConfig,
  rowNode: ComponentRowNode,
  genericStyles: readonly StyleRule[],
): void {
  const responsiveGridStyles = (rowNode.styles ?? []).filter((rule) =>
    isResponsiveGridStyleProperty(rule.property),
  );
  let nextLayout = updateComponentRowAt(
    binding.layout,
    rowRef.locator,
    rowRef.rowId,
    {
      ...row,
      styles: stripGapStyleRules(genericStyles),
    },
  );
  nextLayout = updateGridRowMetaAt(nextLayout, rowRef.locator, rowRef.rowId, {
    styles: responsiveGridStyles.length > 0 ? responsiveGridStyles : undefined,
  });
  binding.setLayout(nextLayout);
}

export function GridRowPanel({
  row,
  rowNode,
  rowRef,
  binding,
  definition,
  designSurface,
  labels,
  treeLabels,
  fieldDescriptors,
}: GridRowPanelProps) {
  const trackCount = row.rows.length;
  const templateAnalysis = useMemo(
    () =>
      analyzeGridTemplateColumns(row.gridTemplateColumns, {
        expectedTrackCount: trackCount,
      }),
    [row.gridTemplateColumns, trackCount],
  );
  const definedTrackCount = countDefinedGridTemplateTracks(
    templateAnalysis.tracks,
  );

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <div className="flex w-full flex-wrap items-start gap-3">
          <StructureRowNameField
            id={`grid-row-name-${rowRef.rowId}`}
            row={rowNode}
            fieldDescriptors={fieldDescriptors}
            treeLabels={treeLabels}
            onChange={(name) => binding.updateGridRowMeta(rowRef, { name })}
            className="flex min-w-0 flex-1 flex-col gap-1 text-sm"
          />
          <div className="flex w-40 shrink-0 flex-col gap-1 text-sm">
            <FieldLabel htmlFor={`grid-row-tracks-${rowRef.rowId}`}>
              {labels.layoutColumns}
            </FieldLabel>
            <PreservedTextInput
              id={`grid-row-tracks-${rowRef.rowId}`}
              type="number"
              min={1}
              max={MAX_NESTED_COLUMNS}
              inputMode="numeric"
              value={String(trackCount)}
              onChange={(rawValue) => {
                const count = Number.parseInt(rawValue, 10);
                if (!Number.isFinite(count)) {
                  return;
                }
                binding.setGridRowTrackCount(rowRef, count);
              }}
            />
          </div>
          <div className="flex w-40 shrink-0 flex-col gap-1 text-sm">
            <FieldLabel htmlFor={`grid-row-gap-${rowRef.rowId}`}>
              {labels.gridGap}
            </FieldLabel>
            <PreservedTextInput
              id={`grid-row-gap-${rowRef.rowId}`}
              value={readGridGapEditorValue(
                row.gap,
                row.styles,
                rowNode.styles,
              )}
              placeholder="24"
              onChange={(gap) => binding.updateGridRowMeta(rowRef, { gap })}
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 text-sm">
          <GridTemplateColumnsFieldLabel
            htmlFor={`grid-template-${rowRef.rowId}`}
            label={labels.gridTemplateColumns}
          />
          <PreservedTextInput
            id={`grid-template-${rowRef.rowId}`}
            value={row.gridTemplateColumns}
            placeholder="repeat(3, minmax(0, 1fr))"
            hasError={!templateAnalysis.ok}
            aria-invalid={!templateAnalysis.ok}
            onChange={(gridTemplateColumns) =>
              binding.setGridRowTemplateColumns(rowRef, gridTemplateColumns)
            }
          />
          <Text className="text-muted-foreground text-xs">
            {labels.gridTemplateColumnsHint(trackCount)}
          </Text>
          {templateAnalysis.preview.length > 0 ? (
            <Text className="text-muted-foreground text-xs">
              {labels.gridTemplateColumnsPreview(
                templateAnalysis.preview,
                templateAnalysis.hasDynamicRepeat,
              )}
            </Text>
          ) : null}
          {templateAnalysis.ok && templateAnalysis.hasFlexibleTracks ? (
            <Text className="text-muted-foreground text-xs">
              {labels.gridTemplateColumnsPreviewFlexible()}
            </Text>
          ) : null}
          {!templateAnalysis.ok ? (
            <FieldError>
              {labels.gridTemplateColumnsError(templateAnalysis.errorCode, {
                defined: definedTrackCount,
                expected: trackCount,
              })}
            </FieldError>
          ) : null}
        </div>

        <ComponentDisplayRangeEditor
          displayFrom={rowNode.displayFrom}
          displayTo={rowNode.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateGridRowMeta(rowRef, patch)}
        />
        <LayoutVisibleWhenEditor
          visibleWhen={rowNode.visibleWhen}
          labels={labels.visibleWhen}
          onChange={(visibleWhen) =>
            binding.updateGridRowMeta(rowRef, { visibleWhen })
          }
        />
      </FormDesignerPanelPrimaryControls>

      <ComponentRowConditionalStylesPanelSection
        row={rowNode}
        rowRef={rowRef}
        binding={binding}
        fieldDescriptors={fieldDescriptors}
        definition={definition}
        designSurface={designSurface}
      />

      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={readGridShellStyleRules(row, rowNode)}
        onChange={(genericStyles) =>
          writeGridShellStyleRules(binding, rowRef, row, rowNode, genericStyles)
        }
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.layoutEffects}
        motion={binding.layout.motion}
        onChange={(motion) => binding.updateLayoutMotion(motion)}
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
