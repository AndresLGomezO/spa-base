import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Database,
  Home,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

/** Keys under `nav.*` used by sidebar link labels */
export type NavLabelKey =
  | "home"
  | "settings"
  | "profile"
  | "team"
  | "billing"
  | "admin"
  | "dataModels";

export interface NavLinkConfig {
  readonly id: string;
  readonly labelKey?: NavLabelKey;
  readonly label?: string;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
}

export interface NavGroupConfig {
  readonly id: string;
  readonly labelKey: NavLabelKey;
  readonly matchPath: string;
  readonly icon: LucideIcon;
  readonly children: readonly NavLinkConfig[];
}

export type NavItemConfig = NavLinkConfig | NavGroupConfig;

export const SETTINGS_DATA_MODELS_NAV_ITEM: NavLinkConfig = {
  id: "data-models",
  labelKey: "dataModels",
  to: "/settings/data-models",
  matchPath: "/settings/data-models",
  icon: Database,
};

export const SETTINGS_ADMIN_NAV_ITEM: NavLinkConfig = {
  id: "admin",
  labelKey: "admin",
  to: "/settings/admin",
  matchPath: "/settings/admin",
  icon: Shield,
};

export function isNavGroup(item: NavItemConfig): item is NavGroupConfig {
  return "children" in item;
}

export const STATIC_NAV_ITEMS: readonly NavItemConfig[] = [
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

export function resolveNavLinkLabel(
  item: Pick<NavLinkConfig, "id" | "labelKey" | "label">,
  t: (key: `nav.${NavLabelKey}`) => string,
): string {
  if (item.label) {
    return item.label;
  }

  if (item.labelKey) {
    return t(`nav.${item.labelKey}`);
  }

  return item.id;
}
