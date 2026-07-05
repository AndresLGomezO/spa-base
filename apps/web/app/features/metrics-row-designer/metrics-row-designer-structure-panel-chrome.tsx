import type { ReactNode } from "react";

import { MetricsRowDesignerComponentColumnPanel } from "./MetricsRowDesignerComponentColumnPanel";
import { MetricsRowDesignerComponentColumnPanelHeaderMenu } from "./MetricsRowDesignerComponentColumnPanelHeaderMenu";
import { MetricsRowDesignerComponentRowPanel } from "./MetricsRowDesignerComponentRowPanel";
import { MetricsRowDesignerComponentRowPanelHeaderMenu } from "./MetricsRowDesignerComponentRowPanelHeaderMenu";
import { MetricsRowDesignerStructurePanelFooter } from "./MetricsRowDesignerStructurePanelFooter";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";

export function renderMetricsRowStructurePanelContent(
  session: MetricsRowPanelSession,
): {
  readonly headerActions: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: (
        <MetricsRowDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: (
        <MetricsRowDesignerComponentColumnPanel columnRef={target.columnRef} />
      ),
      footer: <MetricsRowDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <MetricsRowDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <MetricsRowDesignerComponentRowPanel rowRef={target.rowRef} />,
    footer: <MetricsRowDesignerStructurePanelFooter />,
  };
}
