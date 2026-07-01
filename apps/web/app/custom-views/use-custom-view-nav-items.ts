import { useMemo } from "react";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import { useCustomViewCatalog } from "./custom-view-catalog-context";
import { getCustomViewLabel } from "./custom-view-definition";

export interface CustomViewNavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly matchPath: string;
  readonly icon: ReturnType<typeof resolveLucideIcon>;
  readonly sourceEntity: string;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
  readonly hiddenFromNav?: boolean;
}

export function useCustomViewNavItems(): readonly CustomViewNavItem[] {
  const { items } = useCustomViewCatalog();

  return useMemo(
    () =>
      items
        .filter((view) => view.status === "ACTIVE")
        .map((view) => ({
          id: view.viewId,
          label: getCustomViewLabel(view),
          to: `/app/views/${view.viewId}`,
          matchPath: `/app/views/${view.viewId}`,
          icon: resolveLucideIcon(view.nav.icon),
          sourceEntity: view.sourceEntity,
          ...(view.navCategoryId ? { navCategoryId: view.navCategoryId } : {}),
          ...(view.navOrder !== undefined ? { navOrder: view.navOrder } : {}),
          ...(view.hiddenFromNav ? { hiddenFromNav: view.hiddenFromNav } : {}),
        })),
    [items],
  );
}
