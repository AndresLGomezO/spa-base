import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import {
  updateLayoutMeta,
  updateRootNodeStyles,
  type MotionPreset,
} from "@repo/ui-builder-core";

import { useFormDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import { getFormDesignerOuterLayout } from "./form-designer-layout";
import { useFormDesigner } from "./form-designer-context";

export function FormDesignerRootLayoutPanel() {
  const { editor } = useFormDesigner();
  const { layout, setLayout } = getFormDesignerOuterLayout(editor);
  const labels = useFormDesignerLayoutEditorLabels();

  return (
    <div className="flex flex-col gap-3">
      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={filterStyleRulesForGenericEditor(layout.root.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (layout.root.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          setLayout(
            updateRootNodeStyles(layout, [...genericStyles, ...gridStyles]),
          );
        }}
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.layoutEffects}
        motion={layout.motion}
        onChange={(motion: MotionPreset | undefined) =>
          setLayout(updateLayoutMeta(layout, { motion }))
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
