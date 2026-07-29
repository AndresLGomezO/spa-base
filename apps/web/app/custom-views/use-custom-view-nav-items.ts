import { useMemo } from "react";
import { resolveLucideIcon } from "../lib/resolve-lucide-icon";
import { useTenantLabel } from "../i18n/TenantLocalePacksProvider";
import { useCustomViewCatalog } from "./custom-view-catalog-context";
import { getLocalizedCustomViewLabel } from "./custom-view-definition";

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
  const tTenant = useTenantLabel();

  return useMemo(
    () =>
      items
        .filter((view) => view.status === "ACTIVE")
        .map((view) => ({
          id: view.viewId,
          label: getLocalizedCustomViewLabel(view, tTenant),
          to: `/app/views/${view.viewId}`,
          matchPath: `/app/views/${view.viewId}`,
          icon: resolveLucideIcon(view.nav.icon),
          sourceEntity: view.sourceEntity,
          ...(view.navCategoryId ? { navCategoryId: view.navCategoryId } : {}),
          ...(view.navOrder !== undefined ? { navOrder: view.navOrder } : {}),
          ...(view.hiddenFromNav ? { hiddenFromNav: view.hiddenFromNav } : {}),
        })),
    [items, tTenant],
  );
}
