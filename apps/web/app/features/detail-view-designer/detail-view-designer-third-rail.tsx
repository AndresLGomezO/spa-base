import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  DetailViewDesignerContext,
  type DetailViewDesignerContextValue,
} from "./detail-view-designer-context";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";
import { renderDetailViewStructurePanelContent } from "./detail-view-designer-structure-panel-chrome";

export const detailViewDesignerThirdRail = createDesignerThirdRailKit<
  DetailViewDesignerContextValue,
  DetailViewPanelSession
>({
  Context: DetailViewDesignerContext,
  renderContent: renderDetailViewStructurePanelContent,
});
