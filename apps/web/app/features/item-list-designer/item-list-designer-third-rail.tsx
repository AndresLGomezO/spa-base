import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  ItemListDesignerContext,
  type ItemListDesignerContextValue,
} from "./item-list-designer-context";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";
import { renderItemListStructurePanelContent } from "./item-list-designer-structure-panel-chrome";

export const itemListDesignerThirdRail = createDesignerThirdRailKit<
  ItemListDesignerContextValue,
  ItemListPanelSession
>({
  Context: ItemListDesignerContext,
  renderContent: renderItemListStructurePanelContent,
});
