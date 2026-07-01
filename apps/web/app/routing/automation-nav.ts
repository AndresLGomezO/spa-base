import { useMemo } from "react";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import type { NavLinkConfig } from "../components/sidebar/nav-config";

export const AUTOMATION_MATCH_PATH = "/settings/automation";

function automationEntityPath(entityName: string): string {
  return `/settings/automation/${entityName}`;
}

/** Entity links for the "Automation" collapsible group: one per entity the
 * user can read, gated by `hook.read`. */
export function useAutomationEntityLinks(): readonly NavLinkConfig[] {
  const { permissions, isSuperAdmin } = useAuth();
  const { items } = useEntityCatalog();

  return useMemo(() => {
    if (!hasPermission("hook.read", permissions, { isSuperAdmin })) {
      return [];
    }

    return items
      .filter((definition) =>
        hasPermission(`${definition.name}.read`, permissions, { isSuperAdmin }),
      )
      .map((definition) => ({
        id: `automation-${definition.name}`,
        label: getEntityLabel(definition),
        to: automationEntityPath(definition.name),
        matchPath: automationEntityPath(definition.name),
        icon: resolveLucideIcon(getEntityIconName(definition)),
      }))
      .sort((left, right) =>
        (left.label ?? "").localeCompare(right.label ?? ""),
      );
  }, [items, isSuperAdmin, permissions]);
}
