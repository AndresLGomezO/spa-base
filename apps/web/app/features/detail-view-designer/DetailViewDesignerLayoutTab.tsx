import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDetailViewDesigner } from "./detail-view-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { DetailViewDesignerLayoutTreePanel } from "./DetailViewDesignerLayoutTreePanel";
import { DetailViewDesignerPreviewPanel } from "./DetailViewDesignerPreviewPanel";
import { DetailViewDesignerStructureSessionProvider } from "./DetailViewDesignerStructureSession";

export function DetailViewDesignerLayoutTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useDetailViewDesigner();

  const handleSave = async () => {
    if (!canSave || !layoutIsDirty) {
      return;
    }

    const error = await saveLayout();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 justify-end">
        <Button
          type="button"
          className="shrink-0"
          loading={editor.isSaving}
          disabled={!canSave || !layoutIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <DetailViewDesignerStructureSessionProvider>
        <div className={designerTreeWorkbenchClassName}>
          <DetailViewDesignerLayoutTreePanel />

          <div className={designerPreviewColumnClassName}>
            <DetailViewDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </DetailViewDesignerStructureSessionProvider>
    </div>
  );
}
