import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, LayoutDashboard } from "lucide-react";
import { hasPermission } from "@repo/rbac";
import { metricStripHasContent } from "@repo/entities";

import { useAuth } from "../auth/AuthContext";
import {
  getEntityIconName,
  getEntityLabel,
  type EntityCatalogEntry,
} from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { useCustomViewCatalog } from "../custom-views/custom-view-catalog-context";
import { getCustomViewLabel } from "../custom-views/custom-view-definition";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import {
  listMetricDefinitions,
  type CustomViewRecord,
  type MetricDefinitionRecord,
} from "../lib/api-client.js";
import type {
  NavLinkConfig,
  NavSubGroupConfig,
} from "../components/sidebar/nav-config";
import { entityHasActiveMetrics } from "./entity-metrics-nav.js";

type DesignLayoutKind = "main" | "list" | "detail" | "forms" | "metrics";

const DESIGN_LAYOUT_KIND_PATH_SEGMENT: Record<DesignLayoutKind, string> = {
  main: "main",
  list: "list",
  detail: "detail",
  forms: "forms",
  metrics: "metrics",
};

export function designLayoutEntityPath(
  kind: DesignLayoutKind,
  entityName: string,
): string {
  return `/settings/design-layout/${DESIGN_LAYOUT_KIND_PATH_SEGMENT[kind]}/${entityName}`;
}

export function designLayoutCustomViewPath(
  kind: Extract<DesignLayoutKind, "main" | "list" | "metrics">,
  viewId: string,
): string {
  return `/settings/design-layout/${DESIGN_LAYOUT_KIND_PATH_SEGMENT[kind]}/custom-view/${viewId}`;
}

export const DEFAULT_FORM_DESIGN_ROUTE_ID = "default";

export function designLayoutFormDesignPath(
  entityName: string,
  formDesignId: string = DEFAULT_FORM_DESIGN_ROUTE_ID,
): string {
  return `/settings/design-layout/forms/${entityName}/${formDesignId}`;
}

export function designLayoutFormsHubPath(entityName: string): string {
  return designLayoutEntityPath("forms", entityName);
}

export const DESIGN_LAYOUT_MATCH_PATH = "/settings/design-layout";

export const DESIGN_LAYOUT_PRESETS_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-presets",
  labelKey: "designLayoutPresets",
  to: "/settings/design-layout/presets",
  matchPath: "/settings/design-layout/presets",
  icon: LayoutGrid,
};

export const DESIGN_LAYOUT_DASHBOARD_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-dashboard",
  labelKey: "designLayoutDashboard",
  to: "/settings/design-layout/dashboard",
  matchPath: "/settings/design-layout/dashboard",
  icon: LayoutDashboard,
};

function compareEntityLabels(left: string, right: string): number {
  return left.localeCompare(right);
}

interface BuildDesignLayoutNavInput {
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly entityItems: readonly EntityCatalogEntry[];
  readonly customViewItems: readonly CustomViewRecord[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
}

function buildDesignLayoutEntityLinks(
  kind: DesignLayoutKind,
  input: BuildDesignLayoutNavInput,
): NavLinkConfig[] {
  const { permissions, isSuperAdmin, entityItems } = input;

  if (
    !hasPermission("entityUiOverride.read", permissions, {
      isSuperAdmin,
    })
  ) {
    return [];
  }

  return entityItems
    .filter((definition) =>
      hasPermission(`${definition.name}.read`, permissions, {
        isSuperAdmin,
      }),
    )
    .map((definition) => ({
      id: `design-layout-${kind}-${definition.name}`,
      label: getEntityLabel(definition),
      to: designLayoutEntityPath(kind, definition.name),
      matchPath: designLayoutEntityPath(kind, definition.name),
      icon: resolveLucideIcon(getEntityIconName(definition)),
    }))
    .sort((left, right) => compareEntityLabels(left.label, right.label));
}

function buildDesignLayoutMetricsEntityLinks(
  input: BuildDesignLayoutNavInput,
): NavLinkConfig[] {
  const { permissions, isSuperAdmin, entityItems, metricDefinitions } = input;

  if (
    !hasPermission("entityUiOverride.read", permissions, {
      isSuperAdmin,
    })
  ) {
    return [];
  }

  return entityItems
    .filter((definition) => {
      if (
        !hasPermission(`${definition.name}.read`, permissions, {
          isSuperAdmin,
        })
      ) {
        return false;
      }
      return entityHasActiveMetrics(
        definition.name,
        metricDefinitions,
        metricStripHasContent(definition.ui.metricRowLayout),
      );
    })
    .map((definition) => ({
      id: `design-layout-metrics-${definition.name}`,
      label: getEntityLabel(definition),
      to: designLayoutEntityPath("metrics", definition.name),
      matchPath: designLayoutEntityPath("metrics", definition.name),
      icon: resolveLucideIcon(getEntityIconName(definition)),
    }))
    .sort((left, right) => compareEntityLabels(left.label, right.label));
}

function buildDesignLayoutCustomViewLinks(
  kind: Extract<DesignLayoutKind, "main" | "list" | "metrics">,
  input: BuildDesignLayoutNavInput,
): NavLinkConfig[] {
  const { permissions, isSuperAdmin, customViewItems } = input;

  return customViewItems
    .filter((view) => {
      if (view.status !== "ACTIVE") {
        return false;
      }
      if (
        !hasPermission("customView.read", permissions, { isSuperAdmin }) ||
        !hasPermission("entityUiOverride.read", permissions, {
          isSuperAdmin,
        })
      ) {
        return false;
      }
      return hasPermission(`${view.sourceEntity}.read`, permissions, {
        isSuperAdmin,
      });
    })
    .map((view) => ({
      id: `design-layout-${kind}-custom-view-${view.viewId}`,
      label: getCustomViewLabel(view),
      to: designLayoutCustomViewPath(kind, view.viewId),
      matchPath: designLayoutCustomViewPath(kind, view.viewId),
      icon: resolveLucideIcon(view.nav.icon),
    }))
    .sort((left, right) => compareEntityLabels(left.label, right.label));
}

function buildDesignLayoutNavSubGroups(
  input: BuildDesignLayoutNavInput,
): NavSubGroupConfig[] {
  const mainLinks = buildDesignLayoutEntityLinks("main", input);
  const mainCustomViewLinks = buildDesignLayoutCustomViewLinks("main", input);
  const listLinks = buildDesignLayoutEntityLinks("list", input);
  const listCustomViewLinks = buildDesignLayoutCustomViewLinks("list", input);
  const detailLinks = buildDesignLayoutEntityLinks("detail", input);
  const formsLinks = buildDesignLayoutEntityLinks("forms", input);
  const metricsLinks = buildDesignLayoutMetricsEntityLinks(input);
  const metricsCustomViewLinks = buildDesignLayoutCustomViewLinks(
    "metrics",
    input,
  );

  const subgroups: NavSubGroupConfig[] = [];

  if (mainLinks.length > 0 || mainCustomViewLinks.length > 0) {
    subgroups.push({
      id: "design-layout-main",
      labelKey: "designLayoutMain",
      children: [...mainLinks, ...mainCustomViewLinks],
    });
  }

  if (listLinks.length > 0 || listCustomViewLinks.length > 0) {
    subgroups.push({
      id: "design-layout-list",
      labelKey: "designLayoutList",
      children: [...listLinks, ...listCustomViewLinks],
    });
  }

  if (detailLinks.length > 0) {
    subgroups.push({
      id: "design-layout-detail",
      labelKey: "designLayoutDetail",
      children: detailLinks,
    });
  }

  if (formsLinks.length > 0) {
    subgroups.push({
      id: "design-layout-forms",
      labelKey: "designLayoutForms",
      children: formsLinks,
    });
  }

  if (metricsLinks.length > 0 || metricsCustomViewLinks.length > 0) {
    subgroups.push({
      id: "design-layout-metrics",
      labelKey: "designLayoutMetrics",
      children: [...metricsLinks, ...metricsCustomViewLinks],
    });
  }

  return subgroups;
}

export function useDesignLayoutNavSubGroups(): readonly NavSubGroupConfig[] {
  const { permissions, isSuperAdmin, tenantId } = useAuth();
  const { items: entityItems } = useEntityCatalog();
  const { items: customViewItems } = useCustomViewCatalog();

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

  const subGroupsQuery = useQuery({
    queryKey: [
      "nav",
      "design-layout",
      tenantId,
      permissions,
      entityItems,
      customViewItems,
      definitionsQuery.data,
    ],
    queryFn: () =>
      buildDesignLayoutNavSubGroups({
        permissions,
        isSuperAdmin,
        entityItems,
        customViewItems,
        metricDefinitions: definitionsQuery.data ?? [],
      }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });

  return subGroupsQuery.data ?? [];
}
