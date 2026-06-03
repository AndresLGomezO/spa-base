import { useMemo } from "react";
import { hasPermission } from "@repo/rbac";

import { useAuth } from "../auth/AuthContext";
import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import type {
  NavLinkConfig,
  NavSubGroupConfig,
} from "../components/sidebar/nav-config";

export type DesignLayoutKind = "main" | "list" | "detail" | "forms";

export function designLayoutEntityPath(
  kind: DesignLayoutKind,
  entityName: string,
): string {
  return `/settings/design-layout/${kind}/${entityName}`;
}

export const DESIGN_LAYOUT_MATCH_PATH = "/settings/design-layout";

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

export function useDesignLayoutNavSubGroups(): readonly NavSubGroupConfig[] {
  const mainLinks = useDesignLayoutEntityLinks("main");
  const listLinks = useDesignLayoutEntityLinks("list");
  const detailLinks = useDesignLayoutEntityLinks("detail");
  const formsLinks = useDesignLayoutEntityLinks("forms");

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

    return subgroups;
  }, [detailLinks, formsLinks, listLinks, mainLinks]);
}
