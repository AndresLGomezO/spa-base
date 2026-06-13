import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerHeaderSettingsMenu } from "./MetricsRowDesignerHeaderSettingsMenu";

export function MetricsRowDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint } = useMetricsRowDesigner();

  return (
    <div className="flex items-end gap-3">
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <MetricsRowDesignerHeaderSettingsMenu />
    </div>
  );
}
