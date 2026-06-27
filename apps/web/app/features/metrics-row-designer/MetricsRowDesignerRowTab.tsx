import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { MetricsRowDesignerPreviewPanel } from "./MetricsRowDesignerPreviewPanel";
import { MetricsRowDesignerStructureSessionProvider } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerRowTreePanel } from "./MetricsRowDesignerRowTreePanel";

export function MetricsRowDesignerRowTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, rowLayoutIsDirty, saveRow } =
    useMetricsRowDesigner();

  const handleSave = async () => {
    if (!canSave || !rowLayoutIsDirty) {
      return;
    }

    const error = await saveRow();
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
          disabled={!canSave || !rowLayoutIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <MetricsRowDesignerStructureSessionProvider>
        <div className={designerTreeWorkbenchClassName}>
          <MetricsRowDesignerRowTreePanel />

          <div className={designerPreviewColumnClassName}>
            <MetricsRowDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </MetricsRowDesignerStructureSessionProvider>
    </div>
  );
}
