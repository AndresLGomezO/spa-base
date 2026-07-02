import {
  flattenNavGroupLinks,
  isNavGroup,
  isPathActive,
  type NavItemConfig,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";

export function flattenNavLinks(
  items: readonly NavItemConfig[],
): readonly NavLinkConfig[] {
  const links: NavLinkConfig[] = [];

  for (const item of items) {
    if (isNavGroup(item)) {
      links.push(...flattenNavGroupLinks(item));
    } else {
      links.push(item);
    }
  }

  return links;
}

export function resolveNavPageTitleFromFlatLinks(
  pathname: string,
  flatLinks: readonly NavLinkConfig[],
  resolveLinkLabel?: (link: NavLinkConfig) => string | null,
): string | null {
  for (const link of flatLinks) {
    if (!isPathActive(pathname, link.matchPath)) {
      continue;
    }

    const label =
      link.label && link.label.trim().length > 0
        ? link.label
        : (resolveLinkLabel?.(link) ?? null);

    if (label && label.trim().length > 0) {
      return label;
    }
  }

  return null;
}

export function resolveNavPageTitle(
  pathname: string,
  navItems: readonly NavItemConfig[],
  resolveLinkLabel?: (link: NavLinkConfig) => string | null,
): string | null {
  const links = [...flattenNavLinks(navItems)].sort(
    (left, right) => right.matchPath.length - left.matchPath.length,
  );

  return resolveNavPageTitleFromFlatLinks(pathname, links, resolveLinkLabel);
}
