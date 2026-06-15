import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Database,
  FolderTree,
  Home,
  Layers,
  LayoutTemplate,
  Palette,
  Settings,
  Shield,
  Users,
  Workflow,
  Bot,
  ScanSearch,
} from "lucide-react";

export type NavLabelKey =
  | "home"
  | "settings"
  | "userManagement"
  | "platform"
  | "currentTenant"
  | "appearance"
  | "dataModels"
  | "dataStructure"
  | "dataModelBuilder"
  | "automation"
  | "analytics"
  | "metricsNav"
  | "roles"
  | "entityCategories"
  | "designLayout"
  | "designLayoutMain"
  | "designLayoutList"
  | "designLayoutDetail"
  | "designLayoutForms"
  | "designLayoutMetrics"
  | "designLayoutPresets"
  | "designLayoutDashboard"
  | "aiChat"
  | "aiDebugger";

export interface NavLinkConfig {
  readonly id: string;
  readonly labelKey?: NavLabelKey;
  readonly label?: string;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
}

export interface NavSubGroupConfig {
  readonly id: string;
  readonly labelKey?: NavLabelKey;
  readonly label?: string;
  readonly children: readonly NavLinkConfig[];
}

export type NavGroupChild = NavLinkConfig | NavSubGroupConfig;

export interface NavGroupConfig {
  readonly id: string;
  readonly labelKey?: NavLabelKey;
  readonly label?: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
  readonly children: readonly NavGroupChild[];
}

export type NavItemConfig = NavLinkConfig | NavGroupConfig;

export const DESIGN_LAYOUT_GROUP_ICON = LayoutTemplate;

export function isNavSubGroup(
  child: NavGroupChild,
): child is NavSubGroupConfig {
  return !("to" in child);
}

export function flattenNavGroupLinks(
  group: NavGroupConfig,
): readonly NavLinkConfig[] {
  const links: NavLinkConfig[] = [];
  for (const child of group.children) {
    if (isNavSubGroup(child)) {
      links.push(...child.children);
    } else {
      links.push(child);
    }
  }
  return links;
}

export const HOME_NAV_ITEM: NavLinkConfig = {
  id: "home",
  labelKey: "home",
  to: "/",
  matchPath: "/",
  icon: Home,
};

export const SETTINGS_USER_MANAGEMENT_NAV_ITEM: NavLinkConfig = {
  id: "user-management",
  labelKey: "userManagement",
  to: "/settings/users",
  matchPath: "/settings/users",
  icon: Users,
};

export const SETTINGS_ROLES_NAV_ITEM: NavLinkConfig = {
  id: "roles",
  labelKey: "roles",
  to: "/settings/roles",
  matchPath: "/settings/roles",
  icon: Shield,
};

export const DATA_STRUCTURE_MODEL_BUILDER_NAV_ITEM: NavLinkConfig = {
  id: "data-model-builder",
  labelKey: "dataModelBuilder",
  to: "/settings/data-models",
  matchPath: "/settings/data-models",
  icon: Database,
};

export const SETTINGS_AI_CHAT_NAV_ITEM: NavLinkConfig = {
  id: "ai-chat",
  labelKey: "aiChat",
  to: "/ai/chat",
  matchPath: "/ai/chat",
  icon: Bot,
};

export const SETTINGS_AI_DEBUGGER_NAV_ITEM: NavLinkConfig = {
  id: "ai-debugger",
  labelKey: "aiDebugger",
  to: "/settings/ai-debugger",
  matchPath: "/settings/ai-debugger",
  icon: ScanSearch,
};

export const SETTINGS_AUTOMATION_NAV_ITEM: NavLinkConfig = {
  id: "automation",
  labelKey: "automation",
  to: "/settings/hooks",
  matchPath: "/settings/hooks",
  icon: Workflow,
};

export const SETTINGS_METRICS_NAV_ITEM: NavLinkConfig = {
  id: "metrics",
  labelKey: "metricsNav",
  to: "/settings/metrics",
  matchPath: "/settings/metrics",
  icon: BarChart3,
};

export const ANALYTICS_GROUP_ICON = BarChart3;

export const DATA_STRUCTURE_ENTITY_CATEGORIES_NAV_ITEM: NavLinkConfig = {
  id: "entity-categories",
  labelKey: "entityCategories",
  to: "/settings/entity-categories",
  matchPath: "/settings/entity-categories",
  icon: FolderTree,
};

export const DATA_STRUCTURE_GROUP_ICON = Layers;

export const PLATFORM_CURRENT_TENANT_NAV_ITEM: NavLinkConfig = {
  id: "current-tenant",
  labelKey: "currentTenant",
  to: "/settings/tenant",
  matchPath: "/settings/tenant",
  icon: Building2,
};

export const PLATFORM_APPEARANCE_NAV_ITEM: NavLinkConfig = {
  id: "appearance",
  labelKey: "appearance",
  to: "/settings/appearance",
  matchPath: "/settings/appearance",
  icon: Palette,
};

export const SETTINGS_GROUP_ICON = Settings;

export function isNavGroup(item: NavItemConfig): item is NavGroupConfig {
  return "children" in item;
}

export function isPathActive(pathname: string, matchPath: string): boolean {
  if (matchPath === "/") {
    return pathname === "/";
  }

  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function resolveNavSubGroupLabel(
  subgroup: Pick<NavSubGroupConfig, "id" | "labelKey" | "label">,
  t: (key: `nav.${NavLabelKey}`) => string,
): string {
  if (subgroup.label) {
    return subgroup.label;
  }

  if (subgroup.labelKey) {
    return t(`nav.${subgroup.labelKey}`);
  }

  return subgroup.id;
}

export function isNavSubGroupActive(
  pathname: string,
  subgroup: NavSubGroupConfig,
): boolean {
  return subgroup.children.some((child) =>
    isPathActive(pathname, child.matchPath),
  );
}

export function isNavGroupActive(
  pathname: string,
  group: NavGroupConfig,
): boolean {
  return flattenNavGroupLinks(group).some((child) =>
    isPathActive(pathname, child.matchPath),
  );
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

export function resolveNavGroupLabel(
  group: Pick<NavGroupConfig, "id" | "labelKey" | "label">,
  t: (key: `nav.${NavLabelKey}`) => string,
): string {
  if (group.label) {
    return group.label;
  }

  if (group.labelKey) {
    return t(`nav.${group.labelKey}`);
  }

  return group.id;
}
