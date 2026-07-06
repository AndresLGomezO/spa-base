import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { DesignLayoutEntityTransitionShell } from "../../components/design-layout/DesignLayoutEntityTransitionShell";
import { useDesignLayoutEntityPage } from "../../components/design-layout/use-design-layout-entity-page";
import { MainViewDesignerHeaderActions } from "./MainViewDesignerHeaderActions";
import { MainViewDesignerProvider } from "./MainViewDesignerProvider";
import { MainViewDesignerTabs } from "./MainViewDesignerTabs";

interface MainViewDesignerViewProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}

function MainViewDesignerPageContent({
  entityName,
  customViewId,
}: {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}) {
  const { t } = useTranslation("common");
  const { entitySubtitle, isEntityTransitioning } = useDesignLayoutEntityPage(
    "main",
    entityName,
    customViewId,
  );

  return (
    <BuilderPageShell
      title={t("mainViewDesigner.title")}
      subtitle={entitySubtitle}
      actions={<MainViewDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DesignLayoutEntityTransitionShell loading={isEntityTransitioning}>
        <MainViewDesignerTabs />
      </DesignLayoutEntityTransitionShell>
    </BuilderPageShell>
  );
}

export function MainViewDesignerView({
  entityName,
  customViewId,
}: MainViewDesignerViewProps) {
  return (
    <MainViewDesignerProvider
      key={customViewId ?? entityName}
      entityName={entityName}
      customViewId={customViewId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MainViewDesignerPageContent
          entityName={entityName}
          customViewId={customViewId}
        />
      </div>
    </MainViewDesignerProvider>
  );
}
