import type { ReactNode } from "react";

import { DetailViewDesignerComponentColumnPanelHeaderMenu } from "./DetailViewDesignerComponentColumnPanelHeaderMenu";
import { DetailViewDesignerComponentRowPanelHeaderMenu } from "./DetailViewDesignerComponentRowPanelHeaderMenu";
import { DetailViewDesignerStructurePanelFooter } from "./DetailViewDesignerStructurePanelFooter";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";
import { DetailViewStructurePanelBody } from "./DetailViewStructurePanelBody";

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
      body: <DetailViewStructurePanelBody session={session} />,
      footer: <DetailViewDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <DetailViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <DetailViewStructurePanelBody session={session} />,
    footer: <DetailViewDesignerStructurePanelFooter />,
  };
}
