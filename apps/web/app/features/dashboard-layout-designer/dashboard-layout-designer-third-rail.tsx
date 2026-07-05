import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import { DashboardLayoutDesignerContext } from "./dashboard-layout-designer-context";
import type { DashboardLayoutPanelSession } from "./dashboard-layout-designer-panel-session";
import { renderDashboardLayoutStructurePanelContent } from "./dashboard-layout-designer-structure-panel-chrome";
import type { DashboardLayoutDesignerContextValue } from "./dashboard-layout-designer-context";

export const dashboardLayoutDesignerThirdRail = createDesignerThirdRailKit<
  DashboardLayoutDesignerContextValue,
  DashboardLayoutPanelSession
>({
  Context: DashboardLayoutDesignerContext,
  renderContent: renderDashboardLayoutStructurePanelContent,
});
