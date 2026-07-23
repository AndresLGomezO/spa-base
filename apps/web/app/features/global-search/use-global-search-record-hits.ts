import { useEffect, useState } from "react";

import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { searchCatalog } from "../../lib/api-client";
import {
  GLOBAL_SEARCH_RECORD_LIMIT,
  type GlobalSearchHit,
} from "./global-search-types";
import { mapCatalogSearchItemToHit } from "./map-record-to-global-search-hit";

const QUERY_DEBOUNCE_MS = 180;

export function useGlobalSearchRecordHits(options: {
  readonly open: boolean;
  readonly query: string;
  readonly recordLimit?: number;
}): {
  readonly hits: readonly GlobalSearchHit[];
  readonly isLoading: boolean;
} {
  const { open, query, recordLimit = GLOBAL_SEARCH_RECORD_LIMIT } = options;
  const { items: catalog } = useEntityCatalog();
  const [hits, setHits] = useState<readonly GlobalSearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length === 0) {
      setHits([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await searchCatalog({
            q: trimmed,
            limit: recordLimit,
          });
          if (cancelled) {
            return;
          }
          const next: GlobalSearchHit[] = [];
          for (const item of result.items) {
            const hit = mapCatalogSearchItemToHit({
              item,
              definition: tryGetEntityDefinition(item.entityName, catalog),
              query: trimmed,
            });
            if (hit) {
              next.push(hit);
            }
          }
          setHits(next);
        } catch {
          if (!cancelled) {
            setHits([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      })();
    }, QUERY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [catalog, open, query, recordLimit]);

  return { hits, isLoading };
}
