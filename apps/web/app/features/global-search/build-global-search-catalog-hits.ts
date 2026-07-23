import type { CustomViewRecord } from "@repo/custom-views";

import type { NavLinkConfig } from "../../components/sidebar/nav-config";
import { buildAdminEntityNavPath } from "../../components/sidebar/nav-config";
import {
  getEntityIconName,
  getEntityLabel,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";
import { getCustomViewLabel } from "../../custom-views/custom-view-definition";
import { lucideIconDisplayName } from "./lucide-icon-display-name";
import type { GlobalSearchHit } from "./global-search-types";

export function isEntityOrViewNavPath(to: string): boolean {
  if (to.startsWith("/app/views/") || to.startsWith("/app/all-entities/")) {
    return true;
  }

  const match = /^\/app\/([^/]+)\/?$/.exec(to);
  if (!match?.[1]) {
    return false;
  }

  return match[1] !== "views" && match[1] !== "all-entities";
}

export function buildEntityGlobalSearchHits(options: {
  readonly catalog: readonly EntityCatalogEntry[];
  readonly canReadEntity: (entityName: string) => boolean;
  readonly canBrowseAllEntities: boolean;
}): readonly GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = [];

  for (const definition of options.catalog) {
    if (!options.canReadEntity(definition.name)) {
      continue;
    }

    const hiddenFromNav = definition.hiddenFromNav === true;
    if (hiddenFromNav && !options.canBrowseAllEntities) {
      continue;
    }

    const to = hiddenFromNav
      ? buildAdminEntityNavPath(definition.name)
      : `/app/${definition.name}`;
    const iconName = getEntityIconName(definition);
    const description = definition.description?.trim();

    hits.push({
      id: `entity-${definition.name}`,
      section: "entities",
      label: getEntityLabel(definition),
      to,
      ...(description ? { description } : {}),
      ...(iconName ? { iconName } : {}),
    });
  }

  return hits;
}

export function buildViewGlobalSearchHits(options: {
  readonly views: readonly CustomViewRecord[];
  readonly canReadCustomViews: boolean;
  readonly canReadEntity: (entityName: string) => boolean;
  readonly canReadInternalEntity: boolean;
}): readonly GlobalSearchHit[] {
  if (!options.canReadCustomViews) {
    return [];
  }

  const hits: GlobalSearchHit[] = [];

  for (const view of options.views) {
    if (view.status !== "ACTIVE") {
      continue;
    }
    if (view.hiddenFromNav === true && !options.canReadInternalEntity) {
      continue;
    }
    if (!options.canReadEntity(view.sourceEntity)) {
      continue;
    }

    const description = view.description?.trim();
    const iconName = view.nav.icon?.trim();

    hits.push({
      id: `view-${view.viewId}`,
      section: "views",
      label: getCustomViewLabel(view),
      to: `/app/views/${view.viewId}`,
      ...(description ? { description } : {}),
      ...(iconName ? { iconName } : {}),
    });
  }

  return hits;
}

export function buildFeatureGlobalSearchHits(options: {
  readonly flatLinks: readonly NavLinkConfig[];
  readonly resolveLabel: (link: NavLinkConfig) => string;
}): readonly GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = [];

  for (const link of options.flatLinks) {
    if (isEntityOrViewNavPath(link.to)) {
      continue;
    }

    const iconName = lucideIconDisplayName(link.icon);

    hits.push({
      id: `feature-${link.id}`,
      section: "features",
      label: options.resolveLabel(link),
      to: link.to,
      ...(iconName ? { iconName } : {}),
    });
  }

  return hits;
}

export function buildGlobalSearchCatalogHits(options: {
  readonly catalog: readonly EntityCatalogEntry[];
  readonly views: readonly CustomViewRecord[];
  readonly flatLinks: readonly NavLinkConfig[];
  readonly resolveFeatureLabel: (link: NavLinkConfig) => string;
  readonly canReadEntity: (entityName: string) => boolean;
  readonly canBrowseAllEntities: boolean;
  readonly canReadCustomViews: boolean;
  readonly canReadInternalEntity: boolean;
}): readonly GlobalSearchHit[] {
  return [
    ...buildEntityGlobalSearchHits({
      catalog: options.catalog,
      canReadEntity: options.canReadEntity,
      canBrowseAllEntities: options.canBrowseAllEntities,
    }),
    ...buildViewGlobalSearchHits({
      views: options.views,
      canReadCustomViews: options.canReadCustomViews,
      canReadEntity: options.canReadEntity,
      canReadInternalEntity: options.canReadInternalEntity,
    }),
    ...buildFeatureGlobalSearchHits({
      flatLinks: options.flatLinks,
      resolveLabel: options.resolveFeatureLabel,
    }),
  ];
}
