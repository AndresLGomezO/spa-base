import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  NavItemConfig,
  NavLinkConfig,
} from "../components/sidebar/nav-config";
import { flattenNavLinks } from "./resolve-nav-page-title";
import { useAccessibleNavItems } from "./useAccessibleNavItems";

interface NavItemsContextValue {
  readonly navItems: readonly NavItemConfig[];
  readonly flatLinks: readonly NavLinkConfig[];
}

const NavItemsContext = createContext<NavItemsContextValue | null>(null);

export function NavItemsProvider({ children }: { children: ReactNode }) {
  const navItems = useAccessibleNavItems();
  const flatLinks = useMemo(
    () =>
      [...flattenNavLinks(navItems)].sort(
        (left, right) => right.matchPath.length - left.matchPath.length,
      ),
    [navItems],
  );

  const value = useMemo(() => ({ navItems, flatLinks }), [flatLinks, navItems]);

  return (
    <NavItemsContext.Provider value={value}>
      {children}
    </NavItemsContext.Provider>
  );
}

export function useNavItems(): NavItemsContextValue {
  const context = useContext(NavItemsContext);
  if (!context) {
    throw new Error("useNavItems must be used within NavItemsProvider");
  }
  return context;
}
