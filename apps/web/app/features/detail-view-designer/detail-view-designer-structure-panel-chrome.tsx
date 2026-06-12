import type { ReactNode } from "react";

import { DetailViewDesignerComponentColumnPanel } from "./DetailViewDesignerComponentColumnPanel";
import { DetailViewDesignerComponentColumnPanelHeaderMenu } from "./DetailViewDesignerComponentColumnPanelHeaderMenu";
import { DetailViewDesignerComponentRowPanel } from "./DetailViewDesignerComponentRowPanel";
import { DetailViewDesignerComponentRowPanelHeaderMenu } from "./DetailViewDesignerComponentRowPanelHeaderMenu";
import { DetailViewDesignerStructurePanelFooter } from "./DetailViewDesignerStructurePanelFooter";
import {
  DetailViewDesignerContext,
  type DetailViewDesignerContextValue,
} from "./detail-view-designer-context";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";

function withDetailViewContext(
  value: DetailViewDesignerContextValue,
  children: ReactNode,
): ReactNode {
  return (
    <DetailViewDesignerContext.Provider value={value}>
      {children}
    </DetailViewDesignerContext.Provider>
  );
}

export function renderDetailViewStructurePanelChrome(
  contextValue: DetailViewDesignerContextValue,
  session: DetailViewPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: withDetailViewContext(
        contextValue,
        <DetailViewDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />,
      ),
      body: withDetailViewContext(
        contextValue,
        <DetailViewDesignerComponentColumnPanel columnRef={target.columnRef} />,
      ),
      footer: withDetailViewContext(
        contextValue,
        <DetailViewDesignerStructurePanelFooter />,
      ),
    };
  }

  return {
    headerActions: withDetailViewContext(
      contextValue,
      <DetailViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />,
    ),
    body: withDetailViewContext(
      contextValue,
      <DetailViewDesignerComponentRowPanel rowRef={target.rowRef} />,
    ),
    footer: withDetailViewContext(
      contextValue,
      <DetailViewDesignerStructurePanelFooter />,
    ),
  };
}
