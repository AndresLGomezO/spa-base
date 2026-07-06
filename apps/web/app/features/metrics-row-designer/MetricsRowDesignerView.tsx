import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { DesignLayoutEntityTransitionShell } from "../../components/design-layout/DesignLayoutEntityTransitionShell";
import { useDesignLayoutEntityPage } from "../../components/design-layout/use-design-layout-entity-page";
import type { EntityName } from "../../entities/entity-catalog";
import { MetricsRowDesignerHeaderActions } from "./MetricsRowDesignerHeaderActions";
import { MetricsRowDesignerProvider } from "./MetricsRowDesignerProvider";
import { MetricsRowDesignerTabs } from "./MetricsRowDesignerTabs";

interface MetricsRowDesignerViewProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}

function MetricsRowDesignerPageContent({
  entityName,
  customViewId,
}: {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}) {
  const { t } = useTranslation("common");
  const { entitySubtitle, isEntityTransitioning } = useDesignLayoutEntityPage(
    "metrics",
    entityName,
    customViewId,
  );

  return (
    <BuilderPageShell
      title={t("metricsRowDesigner.title")}
      subtitle={entitySubtitle}
      actions={<MetricsRowDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DesignLayoutEntityTransitionShell loading={isEntityTransitioning}>
        <MetricsRowDesignerTabs />
      </DesignLayoutEntityTransitionShell>
    </BuilderPageShell>
  );
}

export function MetricsRowDesignerView({
  entityName,
  customViewId,
}: MetricsRowDesignerViewProps) {
  return (
    <MetricsRowDesignerProvider
      key={customViewId ?? entityName}
      entityName={entityName}
      customViewId={customViewId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MetricsRowDesignerPageContent
          entityName={entityName}
          customViewId={customViewId}
        />
      </div>
    </MetricsRowDesignerProvider>
  );
}
