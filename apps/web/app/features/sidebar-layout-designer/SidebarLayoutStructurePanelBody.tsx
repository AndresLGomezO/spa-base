import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { SidebarLayoutDesignerComponentColumnPanel } from "./SidebarLayoutDesignerComponentColumnPanel";
import { SidebarLayoutDesignerComponentRowPanel } from "./SidebarLayoutDesignerComponentRowPanel";
import type { SidebarLayoutPanelSession } from "./sidebar-layout-designer-panel-session";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { resolveActiveLayoutBinding } from "./sidebar-layout-designer-layout-binding";
import { useMemo } from "react";

interface SidebarLayoutStructurePanelBodyProps {
  readonly session: SidebarLayoutPanelSession;
}

export function SidebarLayoutStructurePanelBody({
  session,
}: SidebarLayoutStructurePanelBodyProps) {
  const { editor, designFocus } = useSidebarLayoutDesigner();
  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, designFocus),
    [designFocus, editor],
  );

  return (
    <LayoutStructurePanelBody layout={binding.layout} target={session.target}>
      {session.target.kind === "column" ? (
        <SidebarLayoutDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <SidebarLayoutDesignerComponentRowPanel
          rowRef={session.target.rowRef}
        />
      )}
    </LayoutStructurePanelBody>
  );
}
