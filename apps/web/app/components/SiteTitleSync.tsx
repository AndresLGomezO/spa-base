import { useLayoutEffect, useMemo } from "react";
import { useLocation } from "react-router";

import { useAuth } from "../auth/AuthContext";
import { usePageTitleFromNav } from "../routing/page-title-context";

export const DEFAULT_SITE_NAME = "Entity System - ESP";

export function composeDocumentTitle(
  pageTitle: string | null,
  siteName: string,
): string {
  if (pageTitle && pageTitle !== siteName) {
    return `${pageTitle} · ${siteName}`;
  }
  return siteName;
}

function resolveStaticPageTitle(pathname: string): string | null {
  if (pathname === "/login") {
    return "Login";
  }

  return null;
}

/**
 * Sets the browser tab title using the active tenant as the site name.
 */
export function SiteTitleSync() {
  const { activeTenantName } = useAuth();
  const { pathname } = useLocation();
  const pageTitleFromNav = usePageTitleFromNav();
  const pageTitle = pageTitleFromNav ?? resolveStaticPageTitle(pathname);
  const siteName = activeTenantName ?? DEFAULT_SITE_NAME;
  const documentTitle = useMemo(
    () => composeDocumentTitle(pageTitle, siteName),
    [pageTitle, siteName],
  );

  useLayoutEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return null;
}
