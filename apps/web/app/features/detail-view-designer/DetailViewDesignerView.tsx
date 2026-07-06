import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { DesignLayoutEntityTransitionShell } from "../../components/design-layout/DesignLayoutEntityTransitionShell";
import { useDesignLayoutEntityPage } from "../../components/design-layout/use-design-layout-entity-page";
import { DetailViewDesignerHeaderActions } from "./DetailViewDesignerHeaderActions";
import { DetailViewDesignerProvider } from "./DetailViewDesignerProvider";
import { DetailViewDesignerTabs } from "./DetailViewDesignerTabs";

interface DetailViewDesignerViewProps {
  readonly entityName: EntityName;
}

function DetailViewDesignerPageContent({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const { entitySubtitle, isEntityTransitioning } = useDesignLayoutEntityPage(
    "detail",
    entityName,
  );

  return (
    <BuilderPageShell
      title={t("detailViewDesigner.title")}
      subtitle={entitySubtitle}
      actions={<DetailViewDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DesignLayoutEntityTransitionShell loading={isEntityTransitioning}>
        <DetailViewDesignerTabs />
      </DesignLayoutEntityTransitionShell>
    </BuilderPageShell>
  );
}

export function DetailViewDesignerView({
  entityName,
}: DetailViewDesignerViewProps) {
  return (
    <DetailViewDesignerProvider entityName={entityName}>
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailViewDesignerPageContent entityName={entityName} />
      </div>
    </DetailViewDesignerProvider>
  );
}
