import {
  getEntityIconName,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";
import type { CatalogSearchItem } from "../../lib/api-client";
import { buildGlobalSearchRecordSnippet } from "./build-global-search-record-snippet";
import { resolveGlobalSearchHitImageUrl } from "./resolve-global-search-hit-image-url";
import type { GlobalSearchHit } from "./global-search-types";

export function mapCatalogSearchItemToHit(options: {
  readonly item: CatalogSearchItem;
  readonly definition?: EntityCatalogEntry;
  readonly query?: string;
}): GlobalSearchHit | null {
  const { item, definition, query } = options;
  if (item.id.trim().length === 0) {
    return null;
  }

  const imageUrl = resolveGlobalSearchHitImageUrl({
    record: item.record,
    definition,
  });
  const iconName = definition ? getEntityIconName(definition) : undefined;
  const snippet = buildGlobalSearchRecordSnippet({
    record: item.record,
    definition,
    label: item.label,
    query,
  });

  return {
    id: `record-${item.entityName}-${item.id}`,
    section: "entities",
    label: item.label,
    description: item.entityLabel,
    to: `/app/${item.entityName}/${item.id}`,
    entityName: item.entityName,
    ...(snippet ? { snippet } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(!imageUrl && iconName ? { iconName } : {}),
  };
}
