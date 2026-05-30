import { useEffect, useMemo } from "react";
import { useMatches, type UIMatch } from "react-router";

import { useAuth } from "../auth/AuthContext";

export const DEFAULT_SITE_NAME = "Entity System - ESP";

type MetaDescriptor = {
  readonly title?: string;
};

type RouteMatchWithMeta = UIMatch & {
  readonly meta?: readonly MetaDescriptor[];
};

export function getPageTitleFromMatches(matches: UIMatch[]): string | null {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const meta = (matches[index] as RouteMatchWithMeta | undefined)?.meta;
    if (!meta) {
      continue;
    }
    for (const descriptor of meta) {
      if (typeof descriptor.title === "string" && descriptor.title.length > 0) {
        return descriptor.title;
      }
    }
  }
  return null;
}

export function composeDocumentTitle(
  pageTitle: string | null,
  siteName: string,
): string {
  if (pageTitle && pageTitle !== siteName) {
    return `${pageTitle} · ${siteName}`;
  }
  return siteName;
}

/**
 * Sets the browser tab title using the active tenant as the site name.
 */
export function SiteTitleSync() {
  const { activeTenantName } = useAuth();
  const matches = useMatches();
  const pageTitle = useMemo(() => getPageTitleFromMatches(matches), [matches]);
  const siteName = activeTenantName ?? DEFAULT_SITE_NAME;
  const documentTitle = composeDocumentTitle(pageTitle, siteName);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.title = documentTitle;
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [documentTitle]);

  return null;
}
