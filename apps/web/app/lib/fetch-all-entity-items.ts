import { listEntity } from "./api-client";

/** Matches API / query-engine list `limit` cap. */
export const ENTITY_LIST_MAX_LIMIT = 100;

/** Upper bound when preloading relation filter options via paginated list. */
export const RELATION_FILTER_OPTIONS_MAX_ITEMS = 500;

interface FetchAllEntityItemsOptions {
  readonly pageSize?: number;
  readonly maxItems?: number;
}

export async function fetchAllEntityItems<T>(
  entityName: string,
  options: FetchAllEntityItemsOptions = {},
): Promise<readonly T[]> {
  const pageSize = Math.min(
    options.pageSize ?? ENTITY_LIST_MAX_LIMIT,
    ENTITY_LIST_MAX_LIMIT,
  );
  const maxItems = options.maxItems ?? RELATION_FILTER_OPTIONS_MAX_ITEMS;
  const items: T[] = [];
  let cursor: string | undefined;

  while (items.length < maxItems) {
    const page = await listEntity<T>(entityName, {
      limit: pageSize,
      cursor,
    });
    items.push(...page.items);

    if (!page.nextCursor || page.items.length === 0) {
      break;
    }

    cursor = page.nextCursor;
  }

  return items.slice(0, maxItems);
}
