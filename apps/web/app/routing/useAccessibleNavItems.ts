import { useMemo } from "react";

import { useAuth } from "../auth/AuthContext";
import { useEntityNavItems } from "../entities/use-entity-nav-items";
import {
  SETTINGS_ADMIN_NAV_ITEM,
  SETTINGS_DATA_MODELS_NAV_ITEM,
  SETTINGS_ROLES_NAV_ITEM,
  STATIC_NAV_ITEMS,
  isNavGroup,
  type NavItemConfig,
} from "../components/sidebar/nav-config";

export function useAccessibleNavItems(): readonly NavItemConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const entityNavItems = useEntityNavItems();

  return useMemo(() => {
    const home = STATIC_NAV_ITEMS.find((item) => item.id === "home");
    const settings = STATIC_NAV_ITEMS.find((item) => item.id === "settings");
    const entityItems = entityNavItems
      .filter((item) => isSuperAdmin || permissions.includes(`${item.id}.read`))
      .map((item) => ({
        id: item.id,
        label: item.label,
        to: item.to,
        matchPath: item.matchPath,
        icon: item.icon,
      }));

    const items: NavItemConfig[] = [];
    if (home && !isNavGroup(home)) {
      items.push(home);
    }
    items.push(...entityItems);
    if (settings && isNavGroup(settings)) {
      const settingsChildren = [...settings.children];
      if (isSuperAdmin || permissions.includes("entityDefinition.read")) {
        settingsChildren.push(SETTINGS_DATA_MODELS_NAV_ITEM);
      }
      if (isSuperAdmin || permissions.includes("role.read")) {
        settingsChildren.push(SETTINGS_ROLES_NAV_ITEM);
      }
      if (isSuperAdmin) {
        settingsChildren.push(SETTINGS_ADMIN_NAV_ITEM);
      }
      items.push({
        ...settings,
        children: settingsChildren,
      });
    }

    return items;
  }, [entityNavItems, isSuperAdmin, permissions]);
}
