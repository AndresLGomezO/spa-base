import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMainViewDesigner } from "./main-view-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { MainViewDesignerLayoutTreePanel } from "./MainViewDesignerLayoutTreePanel";
import { MainViewDesignerPreviewPanel } from "./MainViewDesignerPreviewPanel";
import { MainViewDesignerStructureSessionProvider } from "./MainViewDesignerStructureSession";

export function MainViewDesignerLayoutTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, layoutIsDirty, saveLayout } = useMainViewDesigner();

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

      <MainViewDesignerStructureSessionProvider>
        <div className={designerTreeWorkbenchClassName}>
          <MainViewDesignerLayoutTreePanel />

          <div className={designerPreviewColumnClassName}>
            <MainViewDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </MainViewDesignerStructureSessionProvider>
    </div>
  );
}
