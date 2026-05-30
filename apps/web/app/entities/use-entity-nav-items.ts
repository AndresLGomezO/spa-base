import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Database } from "lucide-react";

import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";

const ICONS: Record<string, LucideIcon> = {};

const DEFAULT_ICON = Database;

interface EntityNavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: LucideIcon;
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
          icon: (iconName && ICONS[iconName]) || DEFAULT_ICON,
        };
      }),
    [items],
  );
}
