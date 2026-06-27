import { Button, Switch, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useItemListDesigner } from "./item-list-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { ItemListDesignerColumnsTreePanel } from "./ItemListDesignerColumnsTreePanel";
import { ItemListDesignerExpandableColumnsTab } from "./ItemListDesignerExpandableColumnsTab";
import { ItemListDesignerPreviewPanel } from "./ItemListDesignerPreviewPanel";

export function ItemListDesignerColumnsTab() {
  const { editor } = useItemListDesigner();

  if (editor.viewType === "expandableTable") {
    return <ItemListDesignerExpandableColumnsTab />;
  }

  return <ItemListDesignerTableColumnsTab />;
}

function ItemListDesignerTableColumnsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, columnsIsDirty, saveColumns } =
    useItemListDesigner();

  const handleSave = async () => {
    if (!canSave || !columnsIsDirty) {
      return;
    }

    const error = await saveColumns();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <Switch
          variant="ios"
          checked={editor.tableShowActions}
          onChange={(checked) => editor.setTableShowActions(checked)}
          label={t("entity.viewSettings.showActions")}
        />
        <Button
          type="button"
          className="shrink-0"
          loading={editor.isSaving}
          disabled={!canSave || !columnsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <div className={designerTreeWorkbenchClassName}>
        <ItemListDesignerColumnsTreePanel />

        <div className={designerPreviewColumnClassName}>
          <ItemListDesignerPreviewPanel fillHeight />
        </div>
      </div>
    </div>
  );
}
