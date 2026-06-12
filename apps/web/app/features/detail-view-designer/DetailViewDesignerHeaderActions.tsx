import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { DetailViewDesignerHeaderSettingsMenu } from "./DetailViewDesignerHeaderSettingsMenu";

export function DetailViewDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint } = useDetailViewDesigner();

  return (
    <div className="flex items-end gap-3">
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <DetailViewDesignerHeaderSettingsMenu />
    </div>
  );
}
