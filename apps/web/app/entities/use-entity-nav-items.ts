import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";

import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";

export interface EntityNavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
}

export function useEntityNavItems(): readonly EntityNavItem[] {
  const { items } = useEntityCatalog();

  return useMemo(
    () =>
      items.map((definition) => {
        const iconName = getEntityIconName(definition);
        return {
          id: definition.name,
          label: getEntityLabel(definition),
          to: `/app/${definition.name}`,
          matchPath: `/app/${definition.name}`,
          icon: resolveLucideIcon(iconName),
          ...(definition.navCategoryId
            ? { navCategoryId: definition.navCategoryId }
            : {}),
          ...(definition.navOrder !== undefined
            ? { navOrder: definition.navOrder }
            : {}),
        };
      }),
    [items],
  );
}
