import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerColumnsTab } from "./ItemListDesignerColumnsTab";
import { ItemListDesignerLayoutTab } from "./ItemListDesignerLayoutTab";

export function ItemListDesignerDesignTab() {
  const { editor } = useItemListDesigner();

  if (editor.viewType === "card") {
    return <ItemListDesignerLayoutTab />;
  }

  return <ItemListDesignerColumnsTab />;
}
