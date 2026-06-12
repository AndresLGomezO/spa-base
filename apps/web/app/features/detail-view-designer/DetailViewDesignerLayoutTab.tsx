import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDetailViewDesigner } from "./detail-view-designer-context";
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
        <div className="flex min-h-[28rem] gap-4">
          <DetailViewDesignerLayoutTreePanel />

          <div className="min-h-0 min-w-0 flex-1">
            <DetailViewDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </DetailViewDesignerStructureSessionProvider>
    </div>
  );
}
