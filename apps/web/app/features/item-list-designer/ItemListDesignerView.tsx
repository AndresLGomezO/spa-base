import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { ItemListDesignerHeaderActions } from "./ItemListDesignerHeaderActions";
import { ItemListDesignerProvider } from "./ItemListDesignerProvider";
import { ItemListDesignerTabs } from "./ItemListDesignerTabs";

interface ItemListDesignerViewProps {
  readonly entityName: EntityName;
}

function ItemListDesignerPageContent({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <BuilderPageShell
      title={t("itemListDesigner.title")}
      subtitle={t("itemListDesigner.entitySubtitle", { entity: entityLabel })}
      actions={<ItemListDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <ItemListDesignerTabs />
    </BuilderPageShell>
  );
}

export function ItemListDesignerView({
  entityName,
}: ItemListDesignerViewProps) {
  return (
    <ItemListDesignerProvider entityName={entityName}>
      <div className="flex min-h-0 flex-1 flex-col">
        <ItemListDesignerPageContent entityName={entityName} />
      </div>
    </ItemListDesignerProvider>
  );
}
