import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutPageHeader } from "../../../components/design-layout/DesignLayoutPageHeader";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { EntityFormLayoutDesignEditor } from "../../../features/ui-builder/EntityFormLayoutDesignEditor";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutFormsRoute() {
  const { t } = useTranslation("common");
  const params = useParams();
  const entityName = (params.entityName ?? "") as EntityName;
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("designLayout.formsTitle")}>
      <DesignLayoutFormsPage entityName={entityName} />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutFormsPage({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  return (
    <div className="flex min-h-full flex-col gap-4">
      <DesignLayoutPageHeader
        entityName={entityName}
        title={t("designLayout.formsTitle")}
        description={t("designLayout.formsDescription")}
        readOnly={!canSave}
      />
      <EntityFormLayoutDesignEditor entityName={entityName} canSave={canSave} />
    </div>
  );
}
