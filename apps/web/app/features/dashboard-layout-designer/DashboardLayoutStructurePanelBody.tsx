import { useMemo } from "react";

import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { DashboardLayoutDesignerComponentColumnPanel } from "./DashboardLayoutDesignerComponentColumnPanel";
import { DashboardLayoutDesignerComponentRowPanel } from "./DashboardLayoutDesignerComponentRowPanel";
import { resolveActiveLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import type { DashboardLayoutPanelSession } from "./dashboard-layout-designer-panel-session";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";

interface DashboardLayoutStructurePanelBodyProps {
  readonly session: DashboardLayoutPanelSession;
}

export function DashboardLayoutStructurePanelBody({
  session,
}: DashboardLayoutStructurePanelBodyProps) {
  const { editor, designFocus } = useDashboardLayoutDesigner();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, designFocus),
    [designFocus, editor],
  );

  return (
    <LayoutStructurePanelBody layout={binding.layout} target={session.target}>
      {session.target.kind === "column" ? (
        <DashboardLayoutDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <DashboardLayoutDesignerComponentRowPanel
          rowRef={session.target.rowRef}
        />
      )}
    </LayoutStructurePanelBody>
  );
}
