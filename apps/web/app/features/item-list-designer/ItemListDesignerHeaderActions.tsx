import { LayoutPreviewBreakpointSwitcher } from "../ui-builder/LayoutPreviewPanel";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerAiControls } from "./ItemListDesignerAiControls";
import { ItemListDesignerHeaderSettingsMenu } from "./ItemListDesignerHeaderSettingsMenu";

export function ItemListDesignerHeaderActions() {
  const { previewBreakpoint, setPreviewBreakpoint, editor } =
    useItemListDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const entityLabel = definition.ui.nav?.label ?? editor.entityName;

  return (
    <div className="flex items-end gap-3">
      <ItemListDesignerAiControls
        entityName={editor.entityName}
        entityLabel={entityLabel}
        definition={definition}
        editor={editor}
      />
      <LayoutPreviewBreakpointSwitcher
        breakpoint={previewBreakpoint}
        onBreakpointChange={setPreviewBreakpoint}
      />
      <ItemListDesignerHeaderSettingsMenu />
    </div>
  );
}
