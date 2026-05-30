import { useMemo } from "react";
import { Database } from "lucide-react";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { useEntityNavItems } from "../entities/use-entity-nav-items";
import {
  HOME_NAV_ITEM,
  PLATFORM_APPEARANCE_NAV_ITEM,
  PLATFORM_CURRENT_TENANT_NAV_ITEM,
  SETTINGS_AUTOMATION_NAV_ITEM,
  SETTINGS_DATA_MODEL_BUILDER_NAV_ITEM,
  SETTINGS_GROUP_ICON,
  SETTINGS_ROLES_NAV_ITEM,
  SETTINGS_USER_MANAGEMENT_NAV_ITEM,
  type NavItemConfig,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";

export function useAccessibleNavItems(): readonly NavItemConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const entityNavItems = useEntityNavItems();

  return useMemo(() => {
    const items: NavItemConfig[] = [HOME_NAV_ITEM];

    const dataModelChildren: NavLinkConfig[] = entityNavItems
      .filter((item) =>
        hasPermission(`${item.id}.read`, permissions, { isSuperAdmin }),
      )
      .map((item) => ({
        id: item.id,
        label: item.label,
        to: item.to,
        matchPath: item.matchPath,
        icon: item.icon,
      }));

    if (dataModelChildren.length > 0) {
      items.push({
        id: "data-models",
        labelKey: "dataModels",
        matchPath: "/app",
        icon: Database,
        children: dataModelChildren,
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
  }, [entityNavItems, isSuperAdmin, permissions]);
}
