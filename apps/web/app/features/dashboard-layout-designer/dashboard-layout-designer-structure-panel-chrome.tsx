import type { ReactNode } from "react";

import { DashboardLayoutDesignerComponentColumnPanelHeaderMenu } from "./DashboardLayoutDesignerComponentColumnPanelHeaderMenu";
import { DashboardLayoutDesignerComponentRowPanelHeaderMenu } from "./DashboardLayoutDesignerComponentRowPanelHeaderMenu";
import { DashboardLayoutStructurePanelBody } from "./DashboardLayoutStructurePanelBody";
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
        <DashboardLayoutStructurePanelBody session={session} />
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
    body: <DashboardLayoutStructurePanelBody session={session} />,
    footer: <DashboardLayoutDesignerStructurePanelFooter />,
  };
}
