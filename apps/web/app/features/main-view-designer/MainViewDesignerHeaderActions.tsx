import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useMainViewDesigner } from "./main-view-designer-context";
import { MainViewDesignerHeaderSettingsMenu } from "./MainViewDesignerHeaderSettingsMenu";

export function MainViewDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint } = useMainViewDesigner();

  return (
    <div className="flex items-end gap-3">
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <MainViewDesignerHeaderSettingsMenu />
    </div>
  );
}
