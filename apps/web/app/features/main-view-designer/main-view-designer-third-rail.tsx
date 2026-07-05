import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  MainViewDesignerContext,
  type MainViewDesignerContextValue,
} from "./main-view-designer-context";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";
import { renderMainViewStructurePanelContent } from "./main-view-designer-structure-panel-chrome";

export const mainViewDesignerThirdRail = createDesignerThirdRailKit<
  MainViewDesignerContextValue,
  MainViewPanelSession
>({
  Context: MainViewDesignerContext,
  renderContent: renderMainViewStructurePanelContent,
});
