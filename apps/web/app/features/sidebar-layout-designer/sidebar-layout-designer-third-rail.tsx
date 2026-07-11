import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  SidebarLayoutDesignerContext,
  type SidebarLayoutDesignerContextValue,
} from "./sidebar-layout-designer-context";
import type { SidebarLayoutPanelSession } from "./sidebar-layout-designer-panel-session";
import { renderSidebarLayoutStructurePanelContent } from "./sidebar-layout-designer-structure-panel-chrome";

export const sidebarLayoutDesignerThirdRail = createDesignerThirdRailKit<
  SidebarLayoutDesignerContextValue,
  SidebarLayoutPanelSession
>({
  Context: SidebarLayoutDesignerContext,
  renderContent: renderSidebarLayoutStructurePanelContent,
});
