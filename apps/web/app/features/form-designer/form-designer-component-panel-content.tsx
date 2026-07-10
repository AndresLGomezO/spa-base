import type { ReactNode } from "react";

import { FormDesignerComponentColumnPanelHeaderMenu } from "./FormDesignerComponentColumnPanelHeaderMenu";
import { FormDesignerComponentRowPanelFooter } from "./FormDesignerComponentRowPanelFooter";
import { FormDesignerComponentRowPanelHeaderMenu } from "./FormDesignerComponentRowPanelHeaderMenu";
import type { ComponentRowPanelSession } from "./form-designer-component-row-panel-session";
import { FormDesignerComponentStructurePanelBody } from "./FormDesignerComponentStructurePanelBody";

export function renderFormDesignerComponentPanelContent(
  session: ComponentRowPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target, treeScope, stepIndex } = session;

  if (target.kind === "column") {
    const columnProps = {
      columnRef: target.columnRef,
      treeScope,
      stepIndex,
    };

    return {
      headerActions: (
        <FormDesignerComponentColumnPanelHeaderMenu {...columnProps} />
      ),
      body: <FormDesignerComponentStructurePanelBody session={session} />,
      footer: <FormDesignerComponentRowPanelFooter />,
    };
  }

  const rowProps = {
    rowRef: target.rowRef,
    treeScope,
    stepIndex,
  };

  return {
    headerActions: <FormDesignerComponentRowPanelHeaderMenu {...rowProps} />,
    body: <FormDesignerComponentStructurePanelBody session={session} />,
    footer: <FormDesignerComponentRowPanelFooter />,
  };
}
