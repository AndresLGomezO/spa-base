import type { ReactNode } from "react";

import { DashboardLayoutDesignerComponentColumnPanel } from "./DashboardLayoutDesignerComponentColumnPanel";
import { DashboardLayoutDesignerComponentColumnPanelHeaderMenu } from "./DashboardLayoutDesignerComponentColumnPanelHeaderMenu";
import { DashboardLayoutDesignerComponentRowPanel } from "./DashboardLayoutDesignerComponentRowPanel";
import { DashboardLayoutDesignerComponentRowPanelHeaderMenu } from "./DashboardLayoutDesignerComponentRowPanelHeaderMenu";
import { DashboardLayoutDesignerStructurePanelFooter } from "./DashboardLayoutDesignerStructurePanelFooter";
import {
  DashboardLayoutDesignerContext,
  type DashboardLayoutDesignerContextValue,
} from "./dashboard-layout-designer-context";
import type { DashboardLayoutPanelSession } from "./dashboard-layout-designer-panel-session";

function withMainViewContext(
  value: DashboardLayoutDesignerContextValue,
  children: ReactNode,
): ReactNode {
  return (
    <DashboardLayoutDesignerContext.Provider value={value}>
      {children}
    </DashboardLayoutDesignerContext.Provider>
  );
}

export function renderDashboardLayoutStructurePanelChrome(
  contextValue: DashboardLayoutDesignerContextValue,
  session: DashboardLayoutPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: withMainViewContext(
        contextValue,
        <DashboardLayoutDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />,
      ),
      body: withMainViewContext(
        contextValue,
        <DashboardLayoutDesignerComponentColumnPanel
          columnRef={target.columnRef}
        />,
      ),
      footer: withMainViewContext(
        contextValue,
        <DashboardLayoutDesignerStructurePanelFooter />,
      ),
    };
  }

  return {
    headerActions: withMainViewContext(
      contextValue,
      <DashboardLayoutDesignerComponentRowPanelHeaderMenu
        rowRef={target.rowRef}
      />,
    ),
    body: withMainViewContext(
      contextValue,
      <DashboardLayoutDesignerComponentRowPanel rowRef={target.rowRef} />,
    ),
    footer: withMainViewContext(
      contextValue,
      <DashboardLayoutDesignerStructurePanelFooter />,
    ),
  };
}
