import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { MainViewDesignerHeaderActions } from "./MainViewDesignerHeaderActions";
import { MainViewDesignerProvider } from "./MainViewDesignerProvider";
import { MainViewDesignerTabs } from "./MainViewDesignerTabs";

interface MainViewDesignerViewProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}

function MainViewDesignerPageContent({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <BuilderPageShell
      title={t("mainViewDesigner.title")}
      subtitle={t("mainViewDesigner.entitySubtitle", { entity: entityLabel })}
      actions={<MainViewDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <MainViewDesignerTabs />
    </BuilderPageShell>
  );
}

export function MainViewDesignerView({
  entityName,
  customViewId,
}: MainViewDesignerViewProps) {
  return (
    <MainViewDesignerProvider
      entityName={entityName}
      customViewId={customViewId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MainViewDesignerPageContent entityName={entityName} />
      </div>
    </MainViewDesignerProvider>
  );
}
