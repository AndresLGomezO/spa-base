import { BuilderPageShell, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes.js";
import { ChartListTreePanel } from "./ChartListTreePanel.js";
import { ChartSettingsPanel } from "./ChartSettingsPanel.js";
import { ChartsProvider, useCharts } from "./charts-context.js";

function ChartsWorkbench() {
  const { t } = useTranslation("common");
  const { editor } = useCharts();

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("charts.workbench.loading")}
      </Text>
    );
  }

  if (editor.loadError) {
    return <Text className="text-destructive text-sm">{editor.loadError}</Text>;
  }

  return (
    <div className={designerTreeTabRootClassName}>
      <div className={designerTreeWorkbenchClassName}>
        <ChartListTreePanel />
        <div className={designerPreviewColumnClassName}>
          <ChartSettingsPanel />
        </div>
      </div>
    </div>
  );
}

interface ChartsViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
}

export function ChartsView({ canCreate, canUpdate }: ChartsViewProps) {
  const { t } = useTranslation("common");

  return (
    <ChartsProvider canCreate={canCreate} canUpdate={canUpdate}>
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("charts.workbench.title")}
          subtitle={t("charts.workbench.description")}
          bodyScrollable={false}
        >
          <ChartsWorkbench />
        </BuilderPageShell>
      </div>
    </ChartsProvider>
  );
}
