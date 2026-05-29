import type { LucideIcon } from "lucide-react";
import type { Permission } from "@repo/rbac-app";
import { CreditCard, Home, Settings, User, Users } from "lucide-react";

/** Keys under `nav.*` used by sidebar link labels */
export type NavLabelKey = "home" | "settings" | "profile" | "team" | "billing";

export interface NavLinkConfig {
  readonly id: string;
  readonly labelKey: NavLabelKey;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
  readonly requiredPermission?: Permission;
}

interface NavGroupConfig {
  readonly id: string;
  readonly labelKey: NavLabelKey;
  readonly matchPath: string;
  readonly icon: LucideIcon;
  readonly children: readonly NavLinkConfig[];
}

type NavItemConfig = NavLinkConfig | NavGroupConfig;

export function isNavGroup(item: NavItemConfig): item is NavGroupConfig {
  return "children" in item;
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "home",
    labelKey: "home",
    to: "/",
    matchPath: "/",
    icon: Home,
  },
  {
    id: "settings",
    labelKey: "settings",
    matchPath: "/settings",
    icon: Settings,
    children: [
      {
        id: "profile",
        labelKey: "profile",
        to: "/settings/profile",
        matchPath: "/settings/profile",
        icon: User,
        requiredPermission: "user:update_self",
      },
      {
        id: "team",
        labelKey: "team",
        to: "/settings/team",
        matchPath: "/settings/team",
        icon: Users,
        requiredPermission: "team:view",
      },
      {
        id: "billing",
        labelKey: "billing",
        to: "/settings/billing",
        matchPath: "/settings/billing",
        icon: CreditCard,
        requiredPermission: "billing:view",
      },
    ],
  },
];

export function isPathActive(pathname: string, matchPath: string): boolean {
  if (matchPath === "/") {
    return pathname === "/";
  }

  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function filterNavItemsByPermission(
  items: readonly NavItemConfig[],
  hasPermission: (permission: Permission) => boolean,
): NavItemConfig[] {
  const filtered: NavItemConfig[] = [];

  for (const item of items) {
    if (isNavGroup(item)) {
      const children = item.children.filter(
        (child) =>
          !child.requiredPermission || hasPermission(child.requiredPermission),
      );
      if (children.length > 0) {
        filtered.push({ ...item, children });
      }
      continue;
    }

    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      continue;
    }

    filtered.push(item);
  }

  return filtered;
}
