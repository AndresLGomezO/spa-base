import type { ReactNode } from "react";

import { FormDesignerComponentColumnPanel } from "./FormDesignerComponentColumnPanel";
import { FormDesignerComponentColumnPanelHeaderMenu } from "./FormDesignerComponentColumnPanelHeaderMenu";
import { FormDesignerComponentRowPanel } from "./FormDesignerComponentRowPanel";
import { FormDesignerComponentRowPanelFooter } from "./FormDesignerComponentRowPanelFooter";
import { FormDesignerComponentRowPanelHeaderMenu } from "./FormDesignerComponentRowPanelHeaderMenu";
import type { ComponentRowPanelSession } from "./form-designer-component-row-panel-session";

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
      body: <FormDesignerComponentColumnPanel {...columnProps} />,
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
    body: <FormDesignerComponentRowPanel {...rowProps} />,
    footer: <FormDesignerComponentRowPanelFooter />,
  };
}
