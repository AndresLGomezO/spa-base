import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerPreviewPanel } from "./MetricsRowDesignerPreviewPanel";
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
        <div className="flex min-h-[28rem] gap-4">
          <MetricsRowDesignerWidgetsTreePanel />

          <div className="min-h-0 min-w-0 flex-1">
            <MetricsRowDesignerPreviewPanel withStructureChrome />
          </div>
        </div>
      </MetricsRowDesignerStructureSessionProvider>
    </div>
  );
}
