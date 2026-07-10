import { useMemo } from "react";

import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { MetricsRowDesignerComponentColumnPanel } from "./MetricsRowDesignerComponentColumnPanel";
import { MetricsRowDesignerComponentRowPanel } from "./MetricsRowDesignerComponentRowPanel";
import { resolveActiveLayoutBinding } from "./metrics-row-designer-layout-binding";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";

interface MetricsRowStructurePanelBodyProps {
  readonly session: MetricsRowPanelSession;
}

export function MetricsRowStructurePanelBody({
  session,
}: MetricsRowStructurePanelBodyProps) {
  const { editor, activeTabId } = useMetricsRowDesigner();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, activeTabId),
    [activeTabId, editor],
  );

  return (
    <LayoutStructurePanelBody layout={binding.layout} target={session.target}>
      {session.target.kind === "column" ? (
        <MetricsRowDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <MetricsRowDesignerComponentRowPanel rowRef={session.target.rowRef} />
      )}
    </LayoutStructurePanelBody>
  );
}
