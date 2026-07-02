import type { CustomViewNavItem } from "../custom-views/use-custom-view-nav-items";
import type { EntityNavItem } from "../entities/use-entity-nav-items";
import { type NavLinkConfig } from "../components/sidebar/nav-config";

function toNavLink(item: EntityNavItem | CustomViewNavItem): NavLinkConfig {
  return {
    id: item.id,
    label: item.label,
    to: item.to,
    matchPath: item.matchPath,
    icon: item.icon,
  };
}

function categoryNavKey(navCategoryId: string | undefined): string | undefined {
  return navCategoryId;
}

export function mergeCategoryNavChildren(
  navCategoryId: string | undefined,
  entityLinks: readonly EntityNavItem[],
  customViewLinks: readonly CustomViewNavItem[],
): NavLinkConfig[] {
  const matchesCategory = (categoryId: string | undefined) =>
    categoryNavKey(categoryId) === categoryNavKey(navCategoryId);

  const entitiesInCategory = entityLinks.filter((item) =>
    matchesCategory(item.navCategoryId),
  );
  const viewsInCategory = customViewLinks.filter((item) =>
    matchesCategory(item.navCategoryId),
  );
  const sourceEntitiesWithViews = new Set(
    viewsInCategory.map((view) => view.sourceEntity),
  );

  return [
    ...entitiesInCategory
      .filter((item) => !sourceEntitiesWithViews.has(item.id))
      .map(toNavLink),
    ...viewsInCategory.map(toNavLink),
  ].sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));
}
