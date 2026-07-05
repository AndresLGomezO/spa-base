import type { ReactNode } from "react";

import { DetailViewDesignerComponentColumnPanel } from "./DetailViewDesignerComponentColumnPanel";
import { DetailViewDesignerComponentColumnPanelHeaderMenu } from "./DetailViewDesignerComponentColumnPanelHeaderMenu";
import { DetailViewDesignerComponentRowPanel } from "./DetailViewDesignerComponentRowPanel";
import { DetailViewDesignerComponentRowPanelHeaderMenu } from "./DetailViewDesignerComponentRowPanelHeaderMenu";
import { DetailViewDesignerStructurePanelFooter } from "./DetailViewDesignerStructurePanelFooter";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";

export function renderDetailViewStructurePanelContent(
  session: DetailViewPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: (
        <DetailViewDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: (
        <DetailViewDesignerComponentColumnPanel columnRef={target.columnRef} />
      ),
      footer: <DetailViewDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <DetailViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <DetailViewDesignerComponentRowPanel rowRef={target.rowRef} />,
    footer: <DetailViewDesignerStructurePanelFooter />,
  };
}
