import type { LucideIcon } from "lucide-react";
import { isActivePathMatch } from "@repo/ui-builder-core";
import {
  AppWindow,
  BarChart3,
  Blocks,
  Bot,
  Building2,
  ChartColumn,
  ClipboardPen,
  Database,
  FolderTree,
  FunctionSquare,
  Gauge,
  Home,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  Palette,
  Rows3,
  Search,
  Settings,
  Shield,
  Sidebar,
  Users,
  ScanSearch,
  Workflow,
} from "lucide-react";

export type NavLabelKey =
  | "home"
  | "settings"
  | "userManagement"
  | "platform"
  | "allEntities"
  | "currentTenant"
  | "appearance"
  | "observability"
  | "dataModels"
  | "dataStructure"
  | "dataModelBuilder"
  | "automationNav"
  | "analytics"
  | "metricsNav"
  | "chartsNav"
  | "formulasNav"
  | "queryBuilderNav"
  | "customViewsNav"
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
  | "designLayoutAppShell"
  | "aiChat"
  | "debugger"
  | "debuggerAiJobs"
  | "debuggerHookExecutions"
  | "debuggerHookLogs"
  | "debuggerAudit"
  | "debuggerRequestPerf"
  | "debuggerIndexProvision"
  | "debuggerEmailIngest"
  | "systemConfiguration";

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

export const DEBUGGER_GROUP_ICON = ScanSearch;

export const SETTINGS_METRICS_NAV_ITEM: NavLinkConfig = {
  id: "metrics",
  labelKey: "metricsNav",
  to: "/settings/metrics",
  matchPath: "/settings/metrics",
  icon: BarChart3,
};

export const SETTINGS_CHARTS_NAV_ITEM: NavLinkConfig = {
  id: "charts",
  labelKey: "chartsNav",
  to: "/settings/charts",
  matchPath: "/settings/charts",
  icon: LineChart,
};

export const DESIGN_LAYOUT_GROUP_ICON = LayoutTemplate;

export const DESIGN_LAYOUT_MAIN_NAV_ICON = AppWindow;
export const DESIGN_LAYOUT_LIST_NAV_ICON = Rows3;
export const DESIGN_LAYOUT_DETAIL_NAV_ICON = LayoutTemplate;
export const DESIGN_LAYOUT_FORMS_NAV_ICON = ClipboardPen;
export const DESIGN_LAYOUT_METRICS_NAV_ICON = ChartColumn;
export const DESIGN_LAYOUT_PRESETS_NAV_ICON = Blocks;
export const DESIGN_LAYOUT_DASHBOARD_NAV_ICON = LayoutDashboard;
export const DESIGN_LAYOUT_SIDEBAR_NAV_ICON = Sidebar;

export const SETTINGS_FORMULAS_NAV_ITEM: NavLinkConfig = {
  id: "formulas",
  labelKey: "formulasNav",
  to: "/settings/formulas",
  matchPath: "/settings/formulas",
  icon: FunctionSquare,
};

export const SETTINGS_AUTOMATION_NAV_ITEM: NavLinkConfig = {
  id: "automation",
  labelKey: "automationNav",
  to: "/settings/automation",
  matchPath: "/settings/automation",
  icon: Workflow,
};

export const SETTINGS_QUERY_BUILDER_NAV_ITEM: NavLinkConfig = {
  id: "query-builder",
  labelKey: "queryBuilderNav",
  to: "/settings/query-builder",
  matchPath: "/settings/query-builder",
  icon: Search,
};

export const SETTINGS_CUSTOM_VIEWS_NAV_ITEM: NavLinkConfig = {
  id: "custom-views",
  labelKey: "customViewsNav",
  to: "/settings/custom-views",
  matchPath: "/settings/custom-views",
  icon: Sidebar,
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

export const PLATFORM_OBSERVABILITY_NAV_ITEM: NavLinkConfig = {
  id: "observability",
  labelKey: "observability",
  to: "/settings/observability",
  matchPath: "/settings/observability",
  icon: Gauge,
};

export const SETTINGS_GROUP_ICON = Settings;

const SYSTEM_CONFIG_NAV_GROUP_IDS = [
  "data-structure",
  "settings",
  "analytics",
  "design-layout",
  "platform",
] as const;

type SystemConfigNavGroupId = (typeof SYSTEM_CONFIG_NAV_GROUP_IDS)[number];

function isSystemConfigNavGroupId(id: string): id is SystemConfigNavGroupId {
  return (SYSTEM_CONFIG_NAV_GROUP_IDS as readonly string[]).includes(id);
}

function isDataEntityNavGroupId(id: string): boolean {
  return id === "data-models" || id.startsWith("category-");
}

export function findFirstSystemConfigNavIndex(
  items: readonly Pick<NavItemConfig, "id">[],
): number {
  return items.findIndex((item) => isSystemConfigNavGroupId(item.id));
}

export function shouldShowSystemConfigurationNavSection(
  items: readonly Pick<NavItemConfig, "id">[],
): boolean {
  const systemConfigStartIndex = findFirstSystemConfigNavIndex(items);
  if (systemConfigStartIndex <= 0) {
    return false;
  }

  return items
    .slice(0, systemConfigStartIndex)
    .some((item) => isDataEntityNavGroupId(item.id));
}

export function isNavGroup(item: NavItemConfig): item is NavGroupConfig {
  return "children" in item;
}

const ADMIN_ENTITY_NAV_MATCH_PATH_PREFIX = "/app/all-entities";

export function buildAdminEntityNavPath(entityName: string): string {
  return `${ADMIN_ENTITY_NAV_MATCH_PATH_PREFIX}/${entityName}`;
}

export function buildAdminEntityNavMatchPath(entityName: string): string {
  return buildAdminEntityNavPath(entityName);
}

export function isAdminEntityNavPath(pathname: string): boolean {
  return (
    pathname === ADMIN_ENTITY_NAV_MATCH_PATH_PREFIX ||
    pathname.startsWith(`${ADMIN_ENTITY_NAV_MATCH_PATH_PREFIX}/`)
  );
}

export function isPathActive(pathname: string, matchPath: string): boolean {
  return isActivePathMatch(pathname, matchPath);
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
