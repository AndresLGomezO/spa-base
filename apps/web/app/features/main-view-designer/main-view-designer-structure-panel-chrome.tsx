import type { ReactNode } from "react";

import { MainViewDesignerComponentColumnPanel } from "./MainViewDesignerComponentColumnPanel";
import { MainViewDesignerComponentColumnPanelHeaderMenu } from "./MainViewDesignerComponentColumnPanelHeaderMenu";
import { MainViewDesignerComponentRowPanel } from "./MainViewDesignerComponentRowPanel";
import { MainViewDesignerComponentRowPanelHeaderMenu } from "./MainViewDesignerComponentRowPanelHeaderMenu";
import { MainViewDesignerStructurePanelFooter } from "./MainViewDesignerStructurePanelFooter";
import {
  MainViewDesignerContext,
  type MainViewDesignerContextValue,
} from "./main-view-designer-context";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";

function withMainViewContext(
  value: MainViewDesignerContextValue,
  children: ReactNode,
): ReactNode {
  return (
    <MainViewDesignerContext.Provider value={value}>
      {children}
    </MainViewDesignerContext.Provider>
  );
}

export function renderMainViewStructurePanelChrome(
  contextValue: MainViewDesignerContextValue,
  session: MainViewPanelSession,
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
        <MainViewDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />,
      ),
      body: withMainViewContext(
        contextValue,
        <MainViewDesignerComponentColumnPanel columnRef={target.columnRef} />,
      ),
      footer: withMainViewContext(
        contextValue,
        <MainViewDesignerStructurePanelFooter />,
      ),
    };
  }

  return {
    headerActions: withMainViewContext(
      contextValue,
      <MainViewDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />,
    ),
    body: withMainViewContext(
      contextValue,
      <MainViewDesignerComponentRowPanel rowRef={target.rowRef} />,
    ),
    footer: withMainViewContext(
      contextValue,
      <MainViewDesignerStructurePanelFooter />,
    ),
  };
}
