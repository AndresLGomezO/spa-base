import type { ReactNode } from "react";

import { SidebarLayoutDesignerComponentColumnPanelHeaderMenu } from "./SidebarLayoutDesignerComponentColumnPanelHeaderMenu";
import { SidebarLayoutDesignerComponentRowPanelHeaderMenu } from "./SidebarLayoutDesignerComponentRowPanelHeaderMenu";
import { SidebarLayoutDesignerStructurePanelFooter } from "./SidebarLayoutDesignerStructurePanelFooter";
import type { SidebarLayoutPanelSession } from "./sidebar-layout-designer-panel-session";
import { SidebarLayoutStructurePanelBody } from "./SidebarLayoutStructurePanelBody";

export function renderSidebarLayoutStructurePanelContent(
  session: SidebarLayoutPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "column") {
    return {
      headerActions: (
        <SidebarLayoutDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: <SidebarLayoutStructurePanelBody session={session} />,
      footer: <SidebarLayoutDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <SidebarLayoutDesignerComponentRowPanelHeaderMenu
        rowRef={target.rowRef}
      />
    ),
    body: <SidebarLayoutStructurePanelBody session={session} />,
    footer: <SidebarLayoutDesignerStructurePanelFooter />,
  };
}
