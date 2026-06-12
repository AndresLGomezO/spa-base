import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerHeaderSettingsMenu } from "./ItemListDesignerHeaderSettingsMenu";

export function ItemListDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint } = useItemListDesigner();

  return (
    <div className="flex items-end gap-3">
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <ItemListDesignerHeaderSettingsMenu />
    </div>
  );
}
