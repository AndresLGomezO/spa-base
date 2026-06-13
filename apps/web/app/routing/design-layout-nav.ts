import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import { listMetricDefinitions } from "../lib/api-client.js";
import type {
  NavLinkConfig,
  NavSubGroupConfig,
} from "../components/sidebar/nav-config";
import { metricStripHasContent } from "@repo/entities";
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

export const DESIGN_LAYOUT_MATCH_PATH = "/settings/design-layout";

export const DESIGN_LAYOUT_PRESETS_NAV_ITEM: NavLinkConfig = {
  id: "design-layout-presets",
  labelKey: "designLayoutPresets",
  to: "/settings/design-layout/presets",
  matchPath: "/settings/design-layout/presets",
  icon: LayoutGrid,
};

function compareEntityLabels(left: string, right: string): number {
  return left.localeCompare(right);
}

function useDesignLayoutEntityLinks(
  kind: DesignLayoutKind,
): readonly NavLinkConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const { items } = useEntityCatalog();

  return useMemo(() => {
    const links = items
      .filter((definition) => {
        if (
          !hasPermission("entityUiOverride.read", permissions, {
            isSuperAdmin,
          })
        ) {
          return false;
        }
        return hasPermission(`${definition.name}.read`, permissions, {
          isSuperAdmin,
        });
      })
      .map((definition) => ({
        id: `design-layout-${kind}-${definition.name}`,
        label: getEntityLabel(definition),
        to: designLayoutEntityPath(kind, definition.name),
        matchPath: designLayoutEntityPath(kind, definition.name),
        icon: resolveLucideIcon(getEntityIconName(definition)),
      }))
      .sort((left, right) => compareEntityLabels(left.label, right.label));

    return links;
  }, [items, isSuperAdmin, kind, permissions]);
}

function useDesignLayoutMetricsEntityLinks(): readonly NavLinkConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const { items } = useEntityCatalog();

  const canListDefinitions = hasPermission(
    "metricDefinition.read",
    permissions,
    {
      isSuperAdmin,
    },
  );

  const definitionsQuery = useQuery({
    queryKey: ["metric-definitions", "design-layout-nav"],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items;
    },
    enabled: canListDefinitions,
  });

  return useMemo(() => {
    const definitions = definitionsQuery.data ?? [];

    const links = items
      .filter((definition) => {
        if (
          !hasPermission("entityUiOverride.read", permissions, {
            isSuperAdmin,
          })
        ) {
          return false;
        }
        if (
          !hasPermission(`${definition.name}.read`, permissions, {
            isSuperAdmin,
          })
        ) {
          return false;
        }
        return entityHasActiveMetrics(
          definition.name,
          definitions,
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

    return links;
  }, [definitionsQuery.data, isSuperAdmin, items, permissions]);
}

export function useDesignLayoutNavSubGroups(): readonly NavSubGroupConfig[] {
  const mainLinks = useDesignLayoutEntityLinks("main");
  const listLinks = useDesignLayoutEntityLinks("list");
  const detailLinks = useDesignLayoutEntityLinks("detail");
  const formsLinks = useDesignLayoutEntityLinks("forms");
  const metricsLinks = useDesignLayoutMetricsEntityLinks();

  return useMemo(() => {
    const subgroups: NavSubGroupConfig[] = [];

    if (mainLinks.length > 0) {
      subgroups.push({
        id: "design-layout-main",
        labelKey: "designLayoutMain",
        children: mainLinks,
      });
    }

    if (listLinks.length > 0) {
      subgroups.push({
        id: "design-layout-list",
        labelKey: "designLayoutList",
        children: listLinks,
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

    if (metricsLinks.length > 0) {
      subgroups.push({
        id: "design-layout-metrics",
        labelKey: "designLayoutMetrics",
        children: metricsLinks,
      });
    }

    return subgroups;
  }, [detailLinks, formsLinks, listLinks, mainLinks, metricsLinks]);
}
