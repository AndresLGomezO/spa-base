import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { MetricsRowDesignerHeaderActions } from "./MetricsRowDesignerHeaderActions";
import { MetricsRowDesignerProvider } from "./MetricsRowDesignerProvider";
import { MetricsRowDesignerTabs } from "./MetricsRowDesignerTabs";

interface MetricsRowDesignerViewProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}

function MetricsRowDesignerPageContent({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <BuilderPageShell
      title={t("metricsRowDesigner.title")}
      subtitle={t("metricsRowDesigner.entitySubtitle", { entity: entityLabel })}
      actions={<MetricsRowDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <MetricsRowDesignerTabs />
    </BuilderPageShell>
  );
}

export function MetricsRowDesignerView({
  entityName,
  customViewId,
}: MetricsRowDesignerViewProps) {
  return (
    <MetricsRowDesignerProvider
      entityName={entityName}
      customViewId={customViewId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MetricsRowDesignerPageContent entityName={entityName} />
      </div>
    </MetricsRowDesignerProvider>
  );
}
