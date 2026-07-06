import { useMemo } from "react";
import { Database } from "lucide-react";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import {
  useEntityNavItems,
  type EntityNavItem,
} from "../entities/use-entity-nav-items";
import {
  useCustomViewNavItems,
  type CustomViewNavItem,
} from "../custom-views/use-custom-view-nav-items";
import { useEntityNavCategories } from "../hooks/useEntityNavCategories";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import {
  HOME_NAV_ITEM,
  PLATFORM_APPEARANCE_NAV_ITEM,
  PLATFORM_CURRENT_TENANT_NAV_ITEM,
  PLATFORM_OBSERVABILITY_NAV_ITEM,
  ANALYTICS_GROUP_ICON,
  DESIGN_LAYOUT_GROUP_ICON,
  DATA_STRUCTURE_ENTITY_CATEGORIES_NAV_ITEM,
  DATA_STRUCTURE_GROUP_ICON,
  DATA_STRUCTURE_MODEL_BUILDER_NAV_ITEM,
  SETTINGS_AI_CHAT_NAV_ITEM,
  DEBUGGER_GROUP_ICON,
  SETTINGS_METRICS_NAV_ITEM,
  SETTINGS_CHARTS_NAV_ITEM,
  SETTINGS_FORMULAS_NAV_ITEM,
  SETTINGS_AUTOMATION_NAV_ITEM,
  SETTINGS_QUERY_BUILDER_NAV_ITEM,
  SETTINGS_CUSTOM_VIEWS_NAV_ITEM,
  SETTINGS_GROUP_ICON,
  SETTINGS_ROLES_NAV_ITEM,
  SETTINGS_USER_MANAGEMENT_NAV_ITEM,
  type NavGroupChild,
  type NavItemConfig,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";
import {
  DESIGN_LAYOUT_DASHBOARD_NAV_ITEM,
  DESIGN_LAYOUT_MATCH_PATH,
  DESIGN_LAYOUT_PRESETS_NAV_ITEM,
  useDesignLayoutNavLinks,
} from "./design-layout-nav";
import { useAdminEntityNavLinks } from "./useAdminEntityNavLinks";
import {
  buildAccessibleDebuggerNavLinks,
  DEBUGGER_MATCH_PATH,
} from "./debugger-nav";
import { mergeCategoryNavChildren } from "./merge-category-nav-children.js";

function compareNavItems(
  left: EntityNavItem | CustomViewNavItem,
  right: EntityNavItem | CustomViewNavItem,
): number {
  const leftOrder = left.navOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.navOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.label.localeCompare(right.label);
}

export function useAccessibleNavItems(): readonly NavItemConfig[] {
  const { permissions, isSuperAdmin, availableTenants = [] } = useAuth();
  const { items: catalogItems } = useEntityCatalog();
  const entityNavItems = useEntityNavItems();
  const customViewNavItems = useCustomViewNavItems();
  const categoriesQuery = useEntityNavCategories();
  const designLayoutNavLinks = useDesignLayoutNavLinks();
  const adminEntityNavLinks = useAdminEntityNavLinks();

  return useMemo(() => {
    if (availableTenants.length === 0) {
      return [HOME_NAV_ITEM];
    }

    const items: NavItemConfig[] = [HOME_NAV_ITEM];

    const accessibleEntityLinks = entityNavItems
      .filter((item) => {
        const definition = catalogItems.find((entry) => entry.name === item.id);
        if (definition?.hiddenFromNav) {
          return false;
        }
        return hasPermission(`${item.id}.read`, permissions, { isSuperAdmin });
      })
      .sort(compareNavItems);

    const accessibleCustomViewLinks = customViewNavItems
      .filter((item) => {
        if (
          item.hiddenFromNav &&
          !hasPermission("internalEntity.read", permissions, { isSuperAdmin })
        ) {
          return false;
        }
        return (
          hasPermission("customView.read", permissions, { isSuperAdmin }) &&
          hasPermission(`${item.sourceEntity}.read`, permissions, {
            isSuperAdmin,
          })
        );
      })
      .sort(compareNavItems);

    const uncategorizedChildren = mergeCategoryNavChildren(
      undefined,
      accessibleEntityLinks,
      accessibleCustomViewLinks,
    );

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
      const children = mergeCategoryNavChildren(
        category.id,
        accessibleEntityLinks,
        accessibleCustomViewLinks,
      );
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

    const dataStructureChildren: NavGroupChild[] = [];

    if (hasPermission("entityDefinition.read", permissions, { isSuperAdmin })) {
      dataStructureChildren.push(DATA_STRUCTURE_MODEL_BUILDER_NAV_ITEM);
    }
    if (hasPermission("entityCategory.read", permissions, { isSuperAdmin })) {
      dataStructureChildren.push(DATA_STRUCTURE_ENTITY_CATEGORIES_NAV_ITEM);
    }
    if (adminEntityNavLinks.length > 0) {
      dataStructureChildren.push({
        id: "all-entities",
        labelKey: "allEntities",
        children: adminEntityNavLinks,
      });
    }

    if (dataStructureChildren.length > 0) {
      items.push({
        id: "data-structure",
        labelKey: "dataStructure",
        matchPath: "/settings/data-models",
        icon: DATA_STRUCTURE_GROUP_ICON,
        children: dataStructureChildren,
      });
    }

    const settingsChildren: NavLinkConfig[] = [];

    if (hasPermission("tenantUser.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_USER_MANAGEMENT_NAV_ITEM);
    }
    if (hasPermission("role.read", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_ROLES_NAV_ITEM);
    }
    if (hasPermission("ai.chat.run", permissions, { isSuperAdmin })) {
      settingsChildren.push(SETTINGS_AI_CHAT_NAV_ITEM);
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

    const debuggerChildren = buildAccessibleDebuggerNavLinks(
      permissions,
      isSuperAdmin,
    );

    if (debuggerChildren.length > 0) {
      items.push({
        id: "debugger",
        labelKey: "debugger",
        matchPath: DEBUGGER_MATCH_PATH,
        icon: DEBUGGER_GROUP_ICON,
        children: debuggerChildren,
      });
    }

    const analyticsChildren: NavLinkConfig[] = [];

    if (hasPermission("metricDefinition.read", permissions, { isSuperAdmin })) {
      analyticsChildren.push(SETTINGS_METRICS_NAV_ITEM);
    }

    if (hasPermission("chartDefinition.read", permissions, { isSuperAdmin })) {
      analyticsChildren.push(SETTINGS_CHARTS_NAV_ITEM);
    }

    if (hasPermission("formula.read", permissions, { isSuperAdmin })) {
      analyticsChildren.push(SETTINGS_FORMULAS_NAV_ITEM);
    }

    if (
      hasPermission("entityQueryDefinition.read", permissions, { isSuperAdmin })
    ) {
      analyticsChildren.push(SETTINGS_QUERY_BUILDER_NAV_ITEM);
    }

    if (
      hasPermission("customView.create", permissions, { isSuperAdmin }) ||
      hasPermission("customView.update", permissions, { isSuperAdmin })
    ) {
      analyticsChildren.push(SETTINGS_CUSTOM_VIEWS_NAV_ITEM);
    }

    if (hasPermission("hook.read", permissions, { isSuperAdmin })) {
      analyticsChildren.push(SETTINGS_AUTOMATION_NAV_ITEM);
    }

    if (analyticsChildren.length > 0) {
      items.push({
        id: "analytics",
        labelKey: "analytics",
        matchPath: "/settings/metrics",
        icon: ANALYTICS_GROUP_ICON,
        children: analyticsChildren,
      });
    }

    const canAccessDesignLayout = hasPermission(
      "entityUiOverride.read",
      permissions,
      { isSuperAdmin },
    );

    if (canAccessDesignLayout || designLayoutNavLinks.length > 0) {
      const designLayoutChildren = canAccessDesignLayout
        ? [
            DESIGN_LAYOUT_PRESETS_NAV_ITEM,
            DESIGN_LAYOUT_DASHBOARD_NAV_ITEM,
            ...designLayoutNavLinks,
          ]
        : designLayoutNavLinks;

      items.push({
        id: "design-layout",
        labelKey: "designLayout",
        matchPath: DESIGN_LAYOUT_MATCH_PATH,
        icon: DESIGN_LAYOUT_GROUP_ICON,
        children: designLayoutChildren,
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
          PLATFORM_OBSERVABILITY_NAV_ITEM,
        ],
      });
    }

    return items;
  }, [
    adminEntityNavLinks,
    availableTenants.length,
    catalogItems,
    categoriesQuery.data,
    customViewNavItems,
    designLayoutNavLinks,
    entityNavItems,
    isSuperAdmin,
    permissions,
  ]);
}
