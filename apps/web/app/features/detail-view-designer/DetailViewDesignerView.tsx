import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
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
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <BuilderPageShell
      title={t("detailViewDesigner.title")}
      subtitle={t("detailViewDesigner.entitySubtitle", { entity: entityLabel })}
      actions={<DetailViewDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DetailViewDesignerTabs />
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
