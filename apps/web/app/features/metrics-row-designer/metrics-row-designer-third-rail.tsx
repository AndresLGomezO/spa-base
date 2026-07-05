import { createDesignerThirdRailKit } from "../ui-builder/create-designer-third-rail-kit";
import {
  MetricsRowDesignerContext,
  type MetricsRowDesignerContextValue,
} from "./metrics-row-designer-context";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";
import { renderMetricsRowStructurePanelContent } from "./metrics-row-designer-structure-panel-chrome";

export const metricsRowDesignerThirdRail = createDesignerThirdRailKit<
  MetricsRowDesignerContextValue,
  MetricsRowPanelSession
>({
  Context: MetricsRowDesignerContext,
  renderContent: renderMetricsRowStructurePanelContent,
});
