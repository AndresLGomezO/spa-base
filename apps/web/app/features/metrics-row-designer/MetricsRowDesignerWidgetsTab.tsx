import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { MetricsRowDesignerUnifiedPreviewPanel } from "./MetricsRowDesignerUnifiedPreviewPanel";
import { MetricsRowDesignerStructureSessionProvider } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerWidgetsTreePanel } from "./MetricsRowDesignerWidgetsTreePanel";

export function MetricsRowDesignerWidgetsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, widgetsIsDirty, saveWidgets } =
    useMetricsRowDesigner();

  const handleSave = async () => {
    if (!canSave || !widgetsIsDirty) {
      return;
    }

    const error = await saveWidgets();
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
          disabled={!canSave || !widgetsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <MetricsRowDesignerStructureSessionProvider>
        <div className={designerTreeWorkbenchClassName}>
          <MetricsRowDesignerWidgetsTreePanel />

          <div className={designerPreviewColumnClassName}>
            <MetricsRowDesignerUnifiedPreviewPanel withStructureChrome />
          </div>
        </div>
      </MetricsRowDesignerStructureSessionProvider>
    </div>
  );
}
