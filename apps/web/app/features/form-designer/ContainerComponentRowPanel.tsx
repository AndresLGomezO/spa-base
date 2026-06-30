import type { ReactNode } from "react";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ColumnStackDirectionEditor,
  ComponentDisplayRangeEditor,
} from "@repo/ui-builder-react";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import {
  isRowHolderComponent,
  type ComponentRowNode,
  type DesignSurface,
  type MotionPreset,
} from "@repo/ui-builder-core";

import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";

import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsLayoutBinding } from "./form-designer-components-layout";
import type { formDesignerComponentEditorLabels } from "./form-designer-component-editor-labels";
import type { formDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import { StructureRowNameField } from "./StructureItemNameField";
import type { StructureTreeLabels } from "./form-designer-structure-tree";

interface ContainerComponentRowPanelProps {
  readonly row: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly definition: SerializableEntityDefinition;
  readonly labels: ReturnType<typeof formDesignerLayoutEditorLabels>;
  readonly componentEditorLabels: ReturnType<
    typeof formDesignerComponentEditorLabels
  >;
  readonly treeLabels: StructureTreeLabels;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly designSurface: DesignSurface;
  readonly extraControls?: ReactNode;
}

export function ContainerComponentRowPanel({
  row,
  rowRef,
  binding,
  definition,
  labels,
  componentEditorLabels,
  treeLabels,
  fieldDescriptors,
  designSurface,
  extraControls,
}: ContainerComponentRowPanelProps) {
  if (!isRowHolderComponent(row.component)) {
    return null;
  }

  const container = row.component;

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <StructureRowNameField
          id={`container-name-${row.id}`}
          row={row}
          fieldDescriptors={fieldDescriptors}
          treeLabels={treeLabels}
          onChange={(name) => binding.updateRowMeta(rowRef, { name })}
        />
        {extraControls}
        <ColumnStackDirectionEditor
          stackDirection={container.stackDirection}
          onChange={(stackDirection) =>
            binding.updateComponent(rowRef, { ...container, stackDirection })
          }
          labels={labels.stackDirection}
        />
        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

      <ComponentRowClickActionPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={definition}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
      />

      <CollapsibleStyleRulesEditor
        title={componentEditorLabels.componentStyles}
        styles={container.styles}
        onChange={(styles) =>
          binding.updateComponent(rowRef, { ...container, styles })
        }
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.rowEffects}
        motion={row.motion}
        onChange={(motion: MotionPreset | undefined) =>
          binding.updateRowMeta(rowRef, { motion })
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
