import type { ReactNode } from "react";

import { MetricsRowDesignerComponentColumnPanel } from "./MetricsRowDesignerComponentColumnPanel";
import { MetricsRowDesignerComponentColumnPanelHeaderMenu } from "./MetricsRowDesignerComponentColumnPanelHeaderMenu";
import { MetricsRowDesignerComponentRowPanel } from "./MetricsRowDesignerComponentRowPanel";
import { MetricsRowDesignerComponentRowPanelHeaderMenu } from "./MetricsRowDesignerComponentRowPanelHeaderMenu";
import { MetricsRowDesignerStructurePanelFooter } from "./MetricsRowDesignerStructurePanelFooter";
import {
  MetricsRowDesignerContext,
  type MetricsRowDesignerContextValue,
} from "./metrics-row-designer-context";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";

function withMainViewContext(
  value: MetricsRowDesignerContextValue,
  children: ReactNode,
): ReactNode {
  return (
    <MetricsRowDesignerContext.Provider value={value}>
      {children}
    </MetricsRowDesignerContext.Provider>
  );
}

export function renderMetricsRowStructurePanelChrome(
  contextValue: MetricsRowDesignerContextValue,
  session: MetricsRowPanelSession,
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
        <MetricsRowDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />,
      ),
      body: withMainViewContext(
        contextValue,
        <MetricsRowDesignerComponentColumnPanel columnRef={target.columnRef} />,
      ),
      footer: withMainViewContext(
        contextValue,
        <MetricsRowDesignerStructurePanelFooter />,
      ),
    };
  }

  return {
    headerActions: withMainViewContext(
      contextValue,
      <MetricsRowDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />,
    ),
    body: withMainViewContext(
      contextValue,
      <MetricsRowDesignerComponentRowPanel rowRef={target.rowRef} />,
    ),
    footer: withMainViewContext(
      contextValue,
      <MetricsRowDesignerStructurePanelFooter />,
    ),
  };
}
