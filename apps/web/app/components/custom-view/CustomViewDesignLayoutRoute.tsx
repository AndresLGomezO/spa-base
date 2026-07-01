import { Alert, PageLoader } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { DesignLayoutRouteGuard } from "../../components/design-layout/DesignLayoutRouteGuard";
import { getCustomViewLabel } from "../../custom-views/custom-view-definition";
import { useCustomViewByViewId } from "../../custom-views/custom-view-catalog-context";
import { useCustomViewPageDefinition } from "../../custom-views/use-custom-view-page-definition";
import type { EntityName } from "../../entities/entity-catalog";
import { EntityDefinitionOverrideProvider } from "../../entities/entity-catalog-context";

interface CustomViewDesignLayoutRouteProps {
  readonly viewId: string;
  readonly title: string;
  readonly children: (
    entityName: EntityName,
    customViewId: string,
  ) => React.ReactNode;
}

export function CustomViewDesignLayoutRoute({
  viewId,
  title,
  children,
}: CustomViewDesignLayoutRouteProps) {
  const { t } = useTranslation("common");
  const { customView, isLoading, error } = useCustomViewByViewId(viewId);
  const definition = useCustomViewPageDefinition(customView);

  if (isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!customView || !definition) {
    return <Alert>{t("customViews.notFound")}</Alert>;
  }

  const entityName = customView.sourceEntity as EntityName;

  return (
    <DesignLayoutRouteGuard
      title={`${title} — ${getCustomViewLabel(customView)}`}
    >
      <EntityDefinitionOverrideProvider definition={definition}>
        <div className="flex min-h-0 flex-1 flex-col">
          {children(entityName, customView.viewId)}
        </div>
      </EntityDefinitionOverrideProvider>
    </DesignLayoutRouteGuard>
  );
}
