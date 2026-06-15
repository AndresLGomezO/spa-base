import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerPreviewPanel } from "./DashboardLayoutDesignerPreviewPanel";
import { DashboardLayoutDesignerStructureSessionProvider } from "./DashboardLayoutDesignerStructureSession";
import { DashboardLayoutDesignerSectionsTreePanel } from "./DashboardLayoutDesignerSectionsTreePanel";

export function DashboardLayoutDesignerSectionsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, sectionsIsDirty, saveSections } =
    useDashboardLayoutDesigner();

  const handleSave = async () => {
    if (!canSave || !sectionsIsDirty) {
      return;
    }

    const error = await saveSections();
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
          disabled={!canSave || !sectionsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <DashboardLayoutDesignerStructureSessionProvider>
        <div className="flex min-h-[28rem] gap-4">
          <DashboardLayoutDesignerSectionsTreePanel />

          <div className="min-h-0 min-w-0 flex-1">
            <DashboardLayoutDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </DashboardLayoutDesignerStructureSessionProvider>
    </div>
  );
}
