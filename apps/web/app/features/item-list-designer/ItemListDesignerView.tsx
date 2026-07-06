import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { DesignLayoutEntityTransitionShell } from "../../components/design-layout/DesignLayoutEntityTransitionShell";
import { useDesignLayoutEntityPage } from "../../components/design-layout/use-design-layout-entity-page";
import type { EntityName } from "../../entities/entity-catalog";
import { ItemListDesignerHeaderActions } from "./ItemListDesignerHeaderActions";
import { ItemListDesignerProvider } from "./ItemListDesignerProvider";
import { ItemListDesignerTabs } from "./ItemListDesignerTabs";

interface ItemListDesignerViewProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}

function ItemListDesignerPageContent({
  entityName,
  customViewId,
}: {
  readonly entityName: EntityName;
  readonly customViewId?: string;
}) {
  const { t } = useTranslation("common");
  const { entitySubtitle, isEntityTransitioning } = useDesignLayoutEntityPage(
    "list",
    entityName,
    customViewId,
  );

  return (
    <BuilderPageShell
      title={t("itemListDesigner.title")}
      subtitle={entitySubtitle}
      actions={<ItemListDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <DesignLayoutEntityTransitionShell loading={isEntityTransitioning}>
        <ItemListDesignerTabs />
      </DesignLayoutEntityTransitionShell>
    </BuilderPageShell>
  );
}

export function ItemListDesignerView({
  entityName,
  customViewId,
}: ItemListDesignerViewProps) {
  return (
    <ItemListDesignerProvider
      key={customViewId ?? entityName}
      entityName={entityName}
      customViewId={customViewId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <ItemListDesignerPageContent
          entityName={entityName}
          customViewId={customViewId}
        />
      </div>
    </ItemListDesignerProvider>
  );
}
