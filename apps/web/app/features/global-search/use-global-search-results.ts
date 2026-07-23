import { useEffect, useState } from "react";

import {
  filterGlobalSearchHits,
  groupGlobalSearchHitsBySection,
  pickTopGlobalSearchResults,
} from "./global-search-filter";
import type {
  GlobalSearchCatalogSection,
  GlobalSearchHit,
} from "./global-search-types";
import { GLOBAL_SEARCH_RECORD_LIMIT } from "./global-search-types";
import { useGlobalSearchCatalogIndex } from "./use-global-search-catalog-index";
import { useGlobalSearchRecordHits } from "./use-global-search-record-hits";

const QUERY_DEBOUNCE_MS = 180;

interface GlobalSearchResultsState {
  readonly isLoading: boolean;
  readonly hits: readonly GlobalSearchHit[];
  readonly topResults: readonly GlobalSearchHit[];
  readonly bySection: Record<
    GlobalSearchCatalogSection,
    readonly GlobalSearchHit[]
  >;
}

const EMPTY_BY_SECTION: GlobalSearchResultsState["bySection"] = {
  entities: [],
  features: [],
  views: [],
};

export function useGlobalSearchResults(options: {
  readonly open: boolean;
  readonly query: string;
  readonly recordLimit?: number;
}): GlobalSearchResultsState {
  const { open, query, recordLimit = GLOBAL_SEARCH_RECORD_LIMIT } = options;
  const { hits: catalogHits, isLoading: catalogLoading } =
    useGlobalSearchCatalogIndex();
  const { hits: recordHits, isLoading: recordsLoading } =
    useGlobalSearchRecordHits({ open, query, recordLimit });
  const [isFiltering, setIsFiltering] = useState(false);
  const [catalogFiltered, setCatalogFiltered] = useState<
    readonly GlobalSearchHit[]
  >([]);

  useEffect(() => {
    if (!open) {
      setIsFiltering(false);
      setCatalogFiltered([]);
      return;
    }

    let cancelled = false;
    setIsFiltering(true);

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setCatalogFiltered(filterGlobalSearchHits(query, catalogHits));
      setIsFiltering(false);
    }, QUERY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [catalogHits, open, query]);

  if (!open) {
    return {
      isLoading: false,
      hits: [],
      topResults: [],
      bySection: EMPTY_BY_SECTION,
    };
  }

  const hits = [...catalogFiltered, ...recordHits];
  const isLoading = catalogLoading || isFiltering || recordsLoading;
  const hasQuery = query.trim().length > 0;
  const topResults = hasQuery ? pickTopGlobalSearchResults(hits, query) : [];
  const bySection = groupGlobalSearchHitsBySection(hits);

  return {
    isLoading,
    hits,
    topResults,
    bySection,
  };
}
