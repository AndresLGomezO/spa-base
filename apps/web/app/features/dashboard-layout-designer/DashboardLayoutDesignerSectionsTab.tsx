import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
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
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 justify-end">
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
        <div className={designerTreeWorkbenchClassName}>
          <DashboardLayoutDesignerSectionsTreePanel />

          <div className={designerPreviewColumnClassName}>
            <DashboardLayoutDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </DashboardLayoutDesignerStructureSessionProvider>
    </div>
  );
}
