import { useParams } from "react-router";

import { useAuth } from "../../auth/AuthContext";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../entities/use-refresh-entity-catalog-on-mount";
import { EntityRecordDetail } from "../../components/entity/EntityRecordDetail";
import { RequireEntityPermission } from "../../components/entity/RequireEntityPermission";
import { EntityPageSkeleton } from "../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "./entity-not-found";

export default function EntityDetailRoute() {
  const params = useParams();
  const entity = params.entity ?? "";
  const id = params.id ?? "";
  const { isKnownEntity, isLoading: catalogLoading } = useEntityCatalog();
  const { tenantId } = useAuth();
  useRefreshEntityCatalogOnMount();

  if (catalogLoading) {
    return <EntityPageSkeleton />;
  }

  if (!isKnownEntity(entity) || id.length === 0) {
    return <EntityNotFoundRoute />;
  }

  return (
    <RequireEntityPermission entityName={entity}>
      <EntityRecordDetail
        entityName={entity}
        recordId={id}
        tenantId={tenantId ?? ""}
      />
    </RequireEntityPermission>
  );
}
