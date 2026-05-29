import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Folder, Package } from "lucide-react";

import { getEntityIconName, getEntityLabel } from "../entities/entity-catalog";
import { useEntityCatalog } from "../entities/entity-catalog-context";

const ICONS: Record<string, LucideIcon> = {
  building: Building2,
  folder: Folder,
};

const DEFAULT_ICON = Package;

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
