import { BuilderPageShell, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { MetricListTreePanel } from "./MetricListTreePanel";
import { MetricSettingsPanel } from "./MetricSettingsPanel";
import { MetricsProvider, useMetrics } from "./metrics-context";

function MetricsWorkbench() {
  const { t } = useTranslation("common");
  const { editor } = useMetrics();

  if (editor.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metrics.workbench.loading")}
      </Text>
    );
  }

  if (editor.loadError) {
    return <Text className="text-destructive text-sm">{editor.loadError}</Text>;
  }

  return (
    <div className={designerTreeTabRootClassName}>
      <div className={designerTreeWorkbenchClassName}>
        <MetricListTreePanel />
        <div className={designerPreviewColumnClassName}>
          <MetricSettingsPanel />
        </div>
      </div>
    </div>
  );
}

interface MetricsViewProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canBackfill: boolean;
}

export function MetricsView({
  canCreate,
  canUpdate,
  canBackfill,
}: MetricsViewProps) {
  const { t } = useTranslation("common");

  return (
    <MetricsProvider
      canCreate={canCreate}
      canUpdate={canUpdate}
      canBackfill={canBackfill}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <BuilderPageShell
          title={t("metrics.workbench.title")}
          subtitle={t("metrics.workbench.description")}
          bodyScrollable={false}
        >
          <MetricsWorkbench />
        </BuilderPageShell>
      </div>
    </MetricsProvider>
  );
}
