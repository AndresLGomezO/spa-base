import type { LucideIcon } from "lucide-react";
import { CreditCard, Home, Settings, User, Users } from "lucide-react";

/** Keys under `nav.*` used by sidebar link labels */
export type NavLabelKey = "home" | "settings" | "profile" | "team" | "billing";

export interface NavLinkConfig {
  readonly id: string;
  readonly labelKey: NavLabelKey;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
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
      },
      {
        id: "team",
        labelKey: "team",
        to: "/settings/team",
        matchPath: "/settings/team",
        icon: Users,
      },
      {
        id: "billing",
        labelKey: "billing",
        to: "/settings/billing",
        matchPath: "/settings/billing",
        icon: CreditCard,
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
