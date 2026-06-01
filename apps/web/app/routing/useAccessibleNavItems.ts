import { useMemo } from "react";
import { Database } from "lucide-react";
import { canIncludeEntityInCatalog, hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import {
  useEntityNavItems,
  type EntityNavItem,
} from "../entities/use-entity-nav-items";
import { useEntityNavCategories } from "../hooks/useEntityNavCategories";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import {
  HOME_NAV_ITEM,
  PLATFORM_APPEARANCE_NAV_ITEM,
  PLATFORM_CURRENT_TENANT_NAV_ITEM,
  SETTINGS_AUTOMATION_NAV_ITEM,
  SETTINGS_DATA_MODEL_BUILDER_NAV_ITEM,
  SETTINGS_ENTITY_CATEGORIES_NAV_ITEM,
  SETTINGS_GROUP_ICON,
  SETTINGS_ROLES_NAV_ITEM,
  SETTINGS_USER_MANAGEMENT_NAV_ITEM,
  type NavItemConfig,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";

function compareNavItems(left: EntityNavItem, right: EntityNavItem): number {
  const leftOrder = left.navOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.navOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.label.localeCompare(right.label);
}

function toNavLink(item: EntityNavItem): NavLinkConfig {
  return {
    id: item.id,
    label: item.label,
    to: item.to,
    matchPath: item.matchPath,
    icon: item.icon,
  };
}

export function useAccessibleNavItems(): readonly NavItemConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const { items: catalogItems } = useEntityCatalog();
  const entityNavItems = useEntityNavItems();
  const categoriesQuery = useEntityNavCategories();

  return useMemo(() => {
    const items: NavItemConfig[] = [HOME_NAV_ITEM];

    const accessibleEntityLinks = entityNavItems
      .filter((item) => {
        const definition = catalogItems.find((entry) => entry.name === item.id);
        if (
          definition?.hiddenFromNav &&
          !canIncludeEntityInCatalog(
            definition.hiddenFromNav,
            permissions,
            isSuperAdmin,
          )
        ) {
          return false;
        }
        return hasPermission(`${item.id}.read`, permissions, { isSuperAdmin });
      })
      .sort(compareNavItems);

    const uncategorizedChildren = accessibleEntityLinks
      .filter((item) => !item.navCategoryId)
      .map(toNavLink);

    if (uncategorizedChildren.length > 0) {
      items.push({
        id: "data-models",
        labelKey: "dataModels",
        matchPath: "/app",
        icon: Database,
        children: uncategorizedChildren,
      });
    }

    const categories = categoriesQuery.data ?? [];
    for (const category of categories) {
      const children = accessibleEntityLinks
        .filter((item) => item.navCategoryId === category.id)
        .map(toNavLink);
      if (children.length === 0) {
        continue;
      }

      items.push({
        id: `category-${category.id}`,
        label: category.name,
        matchPath: "/app",
        icon: resolveLucideIcon(category.icon),
        children,
      });
    }

    const settingsChildren: NavLinkConfig[] = [];

    if (hasPermission("tenantUser.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_USER_MANAGEMENT_NAV_ITEM);
    }
    if (hasPermission("role.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_ROLES_NAV_ITEM);
    }
    if (hasPermission("entityDefinition.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_DATA_MODEL_BUILDER_NAV_ITEM);
    }
    if (hasPermission("entityCategory.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_ENTITY_CATEGORIES_NAV_ITEM);
    }
    if (hasPermission("hook.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_AUTOMATION_NAV_ITEM);
    }

    if (settingsChildren.length > 0) {
      items.push({
        id: "settings",
        labelKey: "settings",
        matchPath: "/settings",
        icon: SETTINGS_GROUP_ICON,
        children: settingsChildren,
      });
    }

    if (isSuperAdmin) {
      items.push({
        id: "platform",
        labelKey: "platform",
        matchPath: "/settings/tenant",
        icon: PLATFORM_CURRENT_TENANT_NAV_ITEM.icon,
        children: [
          PLATFORM_CURRENT_TENANT_NAV_ITEM,
          PLATFORM_APPEARANCE_NAV_ITEM,
        ],
      });
    }

    return items;
  }, [
    catalogItems,
    categoriesQuery.data,
    entityNavItems,
    isSuperAdmin,
    permissions,
  ]);
}
