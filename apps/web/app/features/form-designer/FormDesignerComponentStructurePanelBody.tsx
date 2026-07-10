import { useMemo } from "react";

import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { FormDesignerComponentColumnPanel } from "./FormDesignerComponentColumnPanel";
import { FormDesignerComponentRowPanel } from "./FormDesignerComponentRowPanel";
import { resolveComponentsLayoutBinding } from "./form-designer-components-layout";
import type { ComponentRowPanelSession } from "./form-designer-component-row-panel-session";
import { useFormDesigner } from "./form-designer-context";

interface FormDesignerComponentStructurePanelBodyProps {
  readonly session: ComponentRowPanelSession;
}

export function FormDesignerComponentStructurePanelBody({
  session,
}: FormDesignerComponentStructurePanelBodyProps) {
  const { editor } = useFormDesigner();
  const { target, treeScope, stepIndex } = session;

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, stepIndex),
    [editor, stepIndex, treeScope],
  );

  return (
    <LayoutStructurePanelBody layout={binding.layout} target={target}>
      {target.kind === "column" ? (
        <FormDesignerComponentColumnPanel
          columnRef={target.columnRef}
          treeScope={treeScope}
          stepIndex={stepIndex}
        />
      ) : (
        <FormDesignerComponentRowPanel
          rowRef={target.rowRef}
          treeScope={treeScope}
          stepIndex={stepIndex}
        />
      )}
    </LayoutStructurePanelBody>
  );
}
