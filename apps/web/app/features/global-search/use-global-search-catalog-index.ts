import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../../auth/AuthContext";
import { resolveNavLinkLabel } from "../../components/sidebar/nav-config";
import { useCustomViewCatalog } from "../../custom-views/custom-view-catalog-context";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useNavItems } from "../../routing/nav-items-context";
import { buildGlobalSearchCatalogHits } from "./build-global-search-catalog-hits";
import type { GlobalSearchHit } from "./global-search-types";

export function useGlobalSearchCatalogIndex(): {
  readonly hits: readonly GlobalSearchHit[];
  readonly isLoading: boolean;
} {
  const { permissions, isSuperAdmin } = useAuth();
  const { items: catalog, isLoading: entitiesLoading } = useEntityCatalog();
  const { items: views, isLoading: viewsLoading } = useCustomViewCatalog();
  const { flatLinks } = useNavItems();
  const { t } = useTranslation("common");

  const isLoading = entitiesLoading || viewsLoading;

  const hits = useMemo(() => {
    const canReadEntity = (entityName: string) =>
      hasPermission(`${entityName}.read`, permissions, { isSuperAdmin });
    const canBrowseAllEntities =
      isSuperAdmin ||
      hasPermission("internalEntity.read", permissions, { isSuperAdmin });
    const canReadCustomViews = hasPermission("customView.read", permissions, {
      isSuperAdmin,
    });
    const canReadInternalEntity = hasPermission(
      "internalEntity.read",
      permissions,
      { isSuperAdmin },
    );

    return buildGlobalSearchCatalogHits({
      catalog,
      views,
      flatLinks,
      resolveFeatureLabel: (link) => resolveNavLinkLabel(link, t),
      canReadEntity,
      canBrowseAllEntities,
      canReadCustomViews,
      canReadInternalEntity,
    });
  }, [catalog, flatLinks, isSuperAdmin, permissions, t, views]);

  return { hits, isLoading };
}
