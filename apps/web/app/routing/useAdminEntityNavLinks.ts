import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import {
  useEntityNavItems,
  type EntityNavItem,
} from "../entities/use-entity-nav-items";
import {
  buildAdminEntityNavPath,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";

function compareEntityNavItems(
  left: EntityNavItem,
  right: EntityNavItem,
): number {
  const leftOrder = left.navOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.navOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.label.localeCompare(right.label);
}

function toEntityNavLink(item: EntityNavItem): NavLinkConfig {
  const adminPath = buildAdminEntityNavPath(item.id);

  return {
    id: `admin-entity-${item.id}`,
    label: item.label,
    to: adminPath,
    matchPath: adminPath,
    icon: item.icon,
  };
}

function useCanBrowseAllEntitiesInSidebar(): boolean {
  const { permissions, isSuperAdmin } = useAuth();

  return (
    isSuperAdmin ||
    hasPermission("internalEntity.read", permissions, { isSuperAdmin })
  );
}

export function useAdminEntityNavLinks(): readonly NavLinkConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const { items: catalogItems } = useEntityCatalog();
  const entityNavItems = useEntityNavItems();
  const { t } = useTranslation("common");
  const canBrowse = useCanBrowseAllEntitiesInSidebar();

  return useMemo(() => {
    if (!canBrowse) {
      return [];
    }

    const hiddenSuffix = t("nav.hiddenEntityBadge");

    return entityNavItems
      .filter((item) =>
        hasPermission(`${item.id}.read`, permissions, { isSuperAdmin }),
      )
      .sort(compareEntityNavItems)
      .map((item) => {
        const definition = catalogItems.find((entry) => entry.name === item.id);
        const hiddenFromNav = definition?.hiddenFromNav === true;
        const link = toEntityNavLink(item);
        if (!hiddenFromNav) {
          return link;
        }

        return {
          ...link,
          label: `${item.label} (${hiddenSuffix})`,
        };
      });
  }, [canBrowse, catalogItems, entityNavItems, isSuperAdmin, permissions, t]);
}
