import type { ReactNode } from "react";

import { DashboardLayoutDesignerComponentColumnPanel } from "./DashboardLayoutDesignerComponentColumnPanel";
import { DashboardLayoutDesignerComponentColumnPanelHeaderMenu } from "./DashboardLayoutDesignerComponentColumnPanelHeaderMenu";
import { DashboardLayoutDesignerComponentRowPanel } from "./DashboardLayoutDesignerComponentRowPanel";
import { DashboardLayoutDesignerComponentRowPanelHeaderMenu } from "./DashboardLayoutDesignerComponentRowPanelHeaderMenu";
import { DashboardLayoutDesignerStructurePanelFooter } from "./DashboardLayoutDesignerStructurePanelFooter";
import type { DashboardLayoutPanelSession } from "./dashboard-layout-designer-panel-session";

export function renderDashboardLayoutStructurePanelContent(
  session: DashboardLayoutPanelSession,
): {
  readonly headerActions: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: (
        <DashboardLayoutDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: (
        <DashboardLayoutDesignerComponentColumnPanel
          columnRef={target.columnRef}
        />
      ),
      footer: <DashboardLayoutDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <DashboardLayoutDesignerComponentRowPanelHeaderMenu
        rowRef={target.rowRef}
      />
    ),
    body: <DashboardLayoutDesignerComponentRowPanel rowRef={target.rowRef} />,
    footer: <DashboardLayoutDesignerStructurePanelFooter />,
  };
}
