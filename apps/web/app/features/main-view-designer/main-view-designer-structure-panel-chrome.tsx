import type { ReactNode } from "react";

import { MainViewDesignerComponentColumnPanel } from "./MainViewDesignerComponentColumnPanel";
import { MainViewDesignerComponentColumnPanelHeaderMenu } from "./MainViewDesignerComponentColumnPanelHeaderMenu";
import { MainViewDesignerComponentRowPanel } from "./MainViewDesignerComponentRowPanel";
import { MainViewDesignerComponentRowPanelHeaderMenu } from "./MainViewDesignerComponentRowPanelHeaderMenu";
import { MainViewDesignerStructurePanelFooter } from "./MainViewDesignerStructurePanelFooter";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";

export function renderMainViewStructurePanelContent(
  session: MainViewPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: (
        <MainViewDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: (
        <MainViewDesignerComponentColumnPanel columnRef={target.columnRef} />
      ),
      footer: <MainViewDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <MainViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <MainViewDesignerComponentRowPanel rowRef={target.rowRef} />,
    footer: <MainViewDesignerStructurePanelFooter />,
  };
}
