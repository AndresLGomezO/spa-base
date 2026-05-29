import { useMemo } from "react";

import { useAuth } from "../auth/AuthContext";
import { useEntityNavItems } from "../entities/use-entity-nav-items";
import {
  CONTROL_PLANE_DASHBOARD_NAV_ITEM,
  CONTROL_PLANE_DATA_MODELS_NAV_ITEM,
  CONTROL_PLANE_HOOKS_NAV_ITEM,
  CONTROL_PLANE_ROLES_NAV_ITEM,
  SETTINGS_ADMIN_NAV_ITEM,
  STATIC_NAV_ITEMS,
  isNavGroup,
  type NavItemConfig,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";

function hasControlPlaneAccess(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  return (
    permissions.includes("entityDefinition.read") ||
    permissions.includes("role.read") ||
    permissions.includes("hook.read")
  );
}

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
    const showControlPlane = hasControlPlaneAccess(permissions, isSuperAdmin);

    if (home && !isNavGroup(home) && !showControlPlane) {
      items.push(home);
    }

    if (showControlPlane) {
      const controlPlaneChildren: NavLinkConfig[] = [];
      controlPlaneChildren.push(CONTROL_PLANE_DASHBOARD_NAV_ITEM);
      if (isSuperAdmin || permissions.includes("entityDefinition.read")) {
        controlPlaneChildren.push(CONTROL_PLANE_DATA_MODELS_NAV_ITEM);
      }
      if (isSuperAdmin || permissions.includes("hook.read")) {
        controlPlaneChildren.push(CONTROL_PLANE_HOOKS_NAV_ITEM);
      }
      if (isSuperAdmin || permissions.includes("role.read")) {
        controlPlaneChildren.push(CONTROL_PLANE_ROLES_NAV_ITEM);
      }

      items.push({
        id: "control-plane",
        labelKey: "controlPlane",
        matchPath: "/settings",
        icon: CONTROL_PLANE_DASHBOARD_NAV_ITEM.icon,
        children: controlPlaneChildren,
      });
    }

    items.push(...entityItems);
    if (settings && isNavGroup(settings)) {
      const settingsChildren = [...settings.children];
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
