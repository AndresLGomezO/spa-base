import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { resolveNavLinkLabel } from "../components/sidebar/nav-config";
import { useNavItems } from "./nav-items-context";
import { resolveNavPageTitleFromFlatLinks } from "./resolve-nav-page-title";

const PageTitleContext = createContext<string | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { flatLinks } = useNavItems();
  const pageTitle = useMemo(
    () =>
      resolveNavPageTitleFromFlatLinks(pathname, flatLinks, (link) =>
        resolveNavLinkLabel(link, t),
      ),
    [flatLinks, pathname, t],
  );

  return (
    <PageTitleContext.Provider value={pageTitle}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleFromNav(): string | null {
  return useContext(PageTitleContext);
}
