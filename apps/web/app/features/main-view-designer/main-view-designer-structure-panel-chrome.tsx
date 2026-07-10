import type { ReactNode } from "react";

import { MainViewDesignerComponentColumnPanelHeaderMenu } from "./MainViewDesignerComponentColumnPanelHeaderMenu";
import { MainViewDesignerComponentRowPanelHeaderMenu } from "./MainViewDesignerComponentRowPanelHeaderMenu";
import { MainViewDesignerStructurePanelFooter } from "./MainViewDesignerStructurePanelFooter";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";
import { MainViewStructurePanelBody } from "./MainViewStructurePanelBody";

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
      body: <MainViewStructurePanelBody session={session} />,
      footer: <MainViewDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <MainViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <MainViewStructurePanelBody session={session} />,
    footer: <MainViewDesignerStructurePanelFooter />,
  };
}
