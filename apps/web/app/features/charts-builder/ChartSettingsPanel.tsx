import { useTranslation } from "react-i18next";
import { Button, Text, toast } from "@repo/ui";

import {
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes.js";
import { ChartDefinitionForm } from "./ChartDefinitionForm.js";
import { ChartPreviewSection } from "./ChartPreviewPanel.js";
import { useCharts } from "./charts-context.js";

export function ChartSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useCharts();

  const definition = editor.selectedDefinition;
  const draft = editor.draft;
  const readOnly = !canUpdate;

  if (!definition || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("charts.workbench.settings.empty")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedChart();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("charts.workbench.saveSuccess"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName} gap-0 overflow-hidden p-0`}
    >
      <div
        className={`${designerPreviewPanelHeaderClassName} shrink-0 px-4 pt-4`}
      >
        <div className="min-w-0 flex-1">
          <Text className="truncate text-base font-semibold">{draft.name}</Text>
          <Text className="text-muted-foreground truncate text-xs">
            {definition.chartId}
          </Text>
        </div>
        <Button
          size="sm"
          disabled={readOnly || !editor.isDirty || editor.isSaving}
          onClick={() => void handleSave()}
        >
          {editor.isSaving ? t("loading") : t("entity.save")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <ChartDefinitionForm />
        </div>

        <div className="border-border min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t">
          <ChartPreviewSection draft={draft} definitionId={definition.id} />
        </div>
      </div>
    </div>
  );
}
