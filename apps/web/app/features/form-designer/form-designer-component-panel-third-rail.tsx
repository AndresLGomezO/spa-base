import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  FormDesignerContext,
  type FormDesignerContextValue,
} from "./form-designer-context";
import type { ComponentRowPanelSession } from "./form-designer-component-row-panel-session";
import { renderFormDesignerComponentPanelContent } from "./form-designer-component-panel-content";

export const formDesignerComponentPanelThirdRail = createDesignerThirdRailKit<
  FormDesignerContextValue,
  ComponentRowPanelSession
>({
  Context: FormDesignerContext,
  renderContent: renderFormDesignerComponentPanelContent,
});
