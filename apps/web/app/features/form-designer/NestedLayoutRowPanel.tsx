import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentDisplayRangeEditor,
  ResponsiveGridEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import {
  MAX_NESTED_COLUMNS,
  type MotionPreset,
  type NestedLayoutRowNode,
} from "@repo/ui-builder-core";
import { FieldLabel, Input } from "@repo/ui";

import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsLayoutBinding } from "./form-designer-components-layout";
import type { formDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import { StructureRowNameField } from "./StructureItemNameField";
import type { StructureTreeLabels } from "./form-designer-structure-tree";

interface NestedLayoutRowPanelProps {
  readonly row: NestedLayoutRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly labels: ReturnType<typeof formDesignerLayoutEditorLabels>;
  readonly treeLabels: StructureTreeLabels;
  readonly fieldDescriptors: readonly FieldDescriptor[];
}

export function NestedLayoutRowPanel({
  row,
  rowRef,
  binding,
  labels,
  treeLabels,
  fieldDescriptors,
}: NestedLayoutRowPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <StructureRowNameField
          id={`nested-layout-name-${row.id}`}
          row={row}
          fieldDescriptors={fieldDescriptors}
          treeLabels={treeLabels}
          onChange={(name) => binding.updateNestedRowMeta(rowRef, { name })}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-24 flex-col gap-1 text-sm">
            <FieldLabel htmlFor={`nested-layout-columns-${row.id}`}>
              {labels.layoutColumns}
            </FieldLabel>
            <Input
              id={`nested-layout-columns-${row.id}`}
              type="number"
              min={1}
              max={MAX_NESTED_COLUMNS}
              value={row.columnCount}
              onChange={(event) => {
                const count = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(count)) {
                  return;
                }
                binding.setNestedRowColumnCount(rowRef, count);
              }}
            />
          </div>

          <ResponsiveGridEditor
            styles={row.styles}
            columnCount={row.columnCount}
            labels={labels.responsiveGrid}
            onChange={(styles) =>
              binding.updateNestedRowMeta(rowRef, { styles })
            }
          />
        </div>

        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateNestedRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={filterStyleRulesForGenericEditor(row.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (row.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          binding.updateNestedRowMeta(rowRef, {
            styles: [...genericStyles, ...gridStyles],
          });
        }}
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
