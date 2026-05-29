import { useMemo } from "react";

import { useAuth } from "../auth/AuthContext";
import { ENTITY_NAV_ITEMS } from "../entities/entity-catalog";
import {
  NAV_ITEMS,
  SETTINGS_ADMIN_NAV_ITEM,
  isNavGroup,
  type NavItemConfig,
} from "../components/sidebar/nav-config";

export function useAccessibleNavItems(): readonly NavItemConfig[] {
  const { permissions, isSuperAdmin } = useAuth();

  return useMemo(() => {
    const home = NAV_ITEMS.find((item) => item.id === "home");
    const settings = NAV_ITEMS.find((item) => item.id === "settings");
    const entityItems = ENTITY_NAV_ITEMS.filter(
      (item) => isSuperAdmin || permissions.includes(`${item.id}.read`),
    ).map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
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
      items.push({
        ...settings,
        children: isSuperAdmin
          ? [...settings.children, SETTINGS_ADMIN_NAV_ITEM]
          : settings.children,
      });
    }

    return items;
  }, [isSuperAdmin, permissions]);
}
