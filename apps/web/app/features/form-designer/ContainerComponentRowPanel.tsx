import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentDisplayRangeEditor,
} from "@repo/ui-builder-react";
import {
  isContainerComponent,
  type ComponentRowNode,
  type MotionPreset,
} from "@repo/ui-builder-core";

import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsLayoutBinding } from "./form-designer-components-layout";
import type { formDesignerComponentEditorLabels } from "./form-designer-component-editor-labels";
import type { formDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";

interface ContainerComponentRowPanelProps {
  readonly row: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly labels: ReturnType<typeof formDesignerLayoutEditorLabels>;
  readonly componentEditorLabels: ReturnType<
    typeof formDesignerComponentEditorLabels
  >;
}

export function ContainerComponentRowPanel({
  row,
  rowRef,
  binding,
  labels,
  componentEditorLabels,
}: ContainerComponentRowPanelProps) {
  if (!isContainerComponent(row.component)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

      <CollapsibleStyleRulesEditor
        title={componentEditorLabels.componentStyles}
        styles={row.component.styles}
        onChange={(styles) =>
          binding.updateComponent(rowRef, { ...row.component, styles })
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
