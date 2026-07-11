import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import type {
  EntityCatalogEntry,
  EntityName,
} from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import {
  listMetricDefinitions,
  type MetricDefinitionRecord,
} from "../lib/api-client.js";
import type { NavLinkConfig } from "../components/sidebar/nav-config";
import {
  DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
  DESIGN_LAYOUT_SIDEBAR_NAV_ICON,
  DESIGN_LAYOUT_DETAIL_NAV_ICON,
  DESIGN_LAYOUT_FORMS_NAV_ICON,
  DESIGN_LAYOUT_LIST_NAV_ICON,
  DESIGN_LAYOUT_MAIN_NAV_ICON,
  DESIGN_LAYOUT_METRICS_NAV_ICON,
  DESIGN_LAYOUT_PRESETS_NAV_ICON,
} from "../components/sidebar/nav-config";
import type { DesignLayoutEntityKind } from "../components/design-layout/design-layout-kind.js";
import { designLayoutKindPath } from "../components/design-layout/design-layout-paths.js";
import {
  buildDesignLayoutFormDesignLocation,
  buildDesignLayoutLocation,
} from "../components/design-layout/design-layout-search-params.js";
import { filterDesignLayoutEntities } from "../components/design-layout/filter-design-layout-entities.js";

type DesignLayoutKind = DesignLayoutEntityKind;

export { designLayoutKindPath } from "../components/design-layout/design-layout-paths.js";

export function designLayoutEntityPath(
  kind: DesignLayoutKind,
  entityName: string,
  existingSearch?: string,
): string {
  return buildDesignLayoutLocation(
    kind,
    { kind: "entity", entityName: entityName as EntityName },
    existingSearch,
  );
}

export function designLayoutCustomViewPath(
  kind: Extract<DesignLayoutKind, "main" | "list" | "metrics">,
  viewId: string,
  existingSearch?: string,
): string {
  return buildDesignLayoutLocation(
    kind,
    { kind: "customView", customViewId: viewId },
    existingSearch,
  );
}

export const DEFAULT_FORM_DESIGN_ROUTE_ID = "default";

export function designLayoutFormDesignPath(
  entityName: string,
  formDesignId: string = DEFAULT_FORM_DESIGN_ROUTE_ID,
  existingSearch?: string,
): string {
  return buildDesignLayoutFormDesignLocation(
    entityName,
    formDesignId,
    existingSearch,
  );
}

export function designLayoutFormsHubPath(
  entityName: string,
  existingSearch?: string,
): string {
  return designLayoutEntityPath("forms", entityName, existingSearch);
}

export const DESIGN_LAYOUT_MATCH_PATH = "/settings/design-layout";

export const DESIGN_LAYOUT_PRESETS_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-presets",
  labelKey: "designLayoutPresets",
  to: "/settings/design-layout/presets",
  matchPath: "/settings/design-layout/presets",
  icon: DESIGN_LAYOUT_PRESETS_NAV_ICON,
};

export const DESIGN_LAYOUT_DASHBOARD_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-dashboard",
  labelKey: "designLayoutDashboard",
  to: "/settings/design-layout/dashboard",
  matchPath: "/settings/design-layout/dashboard",
  icon: DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
};

export const DESIGN_LAYOUT_APP_SHELL_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-app-shell",
  labelKey: "designLayoutAppShell",
  to: "/settings/design-layout/app-shell",
  matchPath: "/settings/design-layout/app-shell",
  icon: DESIGN_LAYOUT_SIDEBAR_NAV_ICON,
};

interface BuildDesignLayoutNavInput {
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly entityItems: readonly EntityCatalogEntry[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
}

const DESIGN_LAYOUT_FEATURE_LABEL_KEY: Record<
  DesignLayoutKind,
  NavLinkConfig["labelKey"]
> = {
  main: "designLayoutMain",
  list: "designLayoutList",
  detail: "designLayoutDetail",
  forms: "designLayoutForms",
  metrics: "designLayoutMetrics",
};

const DESIGN_LAYOUT_FEATURE_ICON: Record<
  DesignLayoutKind,
  NavLinkConfig["icon"]
> = {
  main: DESIGN_LAYOUT_MAIN_NAV_ICON,
  list: DESIGN_LAYOUT_LIST_NAV_ICON,
  detail: DESIGN_LAYOUT_DETAIL_NAV_ICON,
  forms: DESIGN_LAYOUT_FORMS_NAV_ICON,
  metrics: DESIGN_LAYOUT_METRICS_NAV_ICON,
};

function buildDesignLayoutFeatureLink(
  kind: DesignLayoutKind,
  input: BuildDesignLayoutNavInput,
): NavLinkConfig | null {
  const filtered = filterDesignLayoutEntities(
    kind,
    input.entityItems,
    input.permissions,
    input.isSuperAdmin,
    input.metricDefinitions,
  );

  if (filtered.length === 0) {
    return null;
  }

  const basePath = designLayoutKindPath(kind);

  return {
    id: `design-layout-${kind}`,
    labelKey: DESIGN_LAYOUT_FEATURE_LABEL_KEY[kind],
    to: basePath,
    matchPath: basePath,
    icon: DESIGN_LAYOUT_FEATURE_ICON[kind],
  };
}

export function buildDesignLayoutNavLinks(
  input: BuildDesignLayoutNavInput,
): NavLinkConfig[] {
  const kinds: DesignLayoutKind[] = [
    "main",
    "list",
    "detail",
    "forms",
    "metrics",
  ];

  return kinds
    .map((kind) => buildDesignLayoutFeatureLink(kind, input))
    .filter((link): link is NavLinkConfig => link !== null);
}

export function useDesignLayoutNavLinks(): readonly NavLinkConfig[] {
  const { permissions, isSuperAdmin, tenantId } = useAuth();
  const { items: entityItems } = useEntityCatalog();

  const canListDefinitions = hasPermission(
    "metricDefinition.read",
    permissions,
    {
      isSuperAdmin,
    },
  );

  const definitionsQuery = useQuery({
    queryKey: ["metric-definitions", "design-layout-nav", tenantId],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items;
    },
    enabled: canListDefinitions && Boolean(tenantId),
    staleTime: 30_000,
  });

  const linksQuery = useQuery({
    queryKey: [
      "nav",
      "design-layout",
      tenantId,
      permissions,
      entityItems,
      definitionsQuery.data,
    ],
    queryFn: () =>
      buildDesignLayoutNavLinks({
        permissions,
        isSuperAdmin,
        entityItems,
        metricDefinitions: definitionsQuery.data ?? [],
      }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });

  return linksQuery.data ?? [];
}
