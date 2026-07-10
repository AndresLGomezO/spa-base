import type { ReactNode } from "react";

import { MetricsRowDesignerComponentColumnPanelHeaderMenu } from "./MetricsRowDesignerComponentColumnPanelHeaderMenu";
import { MetricsRowDesignerComponentRowPanelHeaderMenu } from "./MetricsRowDesignerComponentRowPanelHeaderMenu";
import { MetricsRowDesignerStructurePanelFooter } from "./MetricsRowDesignerStructurePanelFooter";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";
import { MetricsRowStructurePanelBody } from "./MetricsRowStructurePanelBody";

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
      body: <MetricsRowStructurePanelBody session={session} />,
      footer: <MetricsRowDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <MetricsRowDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <MetricsRowStructurePanelBody session={session} />,
    footer: <MetricsRowDesignerStructurePanelFooter />,
  };
}
