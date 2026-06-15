import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerHeaderSettingsMenu } from "./DashboardLayoutDesignerHeaderSettingsMenu";

export function DashboardLayoutDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint } =
    useDashboardLayoutDesigner();

  return (
    <div className="flex items-end gap-3">
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <DashboardLayoutDesignerHeaderSettingsMenu />
    </div>
  );
}
