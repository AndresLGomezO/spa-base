import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";

const GLOBAL_SEARCH_RESULTS_STATIC_TABS = [
  "all",
  "features",
  "views",
  "types",
] as const;

type GlobalSearchResultsStaticTab =
  (typeof GLOBAL_SEARCH_RESULTS_STATIC_TABS)[number];

/** Static category tabs, or a catalog entity name for record hits. */
export type GlobalSearchResultsTab = string;

export const GLOBAL_SEARCH_RESULTS_SORTS = [
  "relevance",
  "nameAsc",
  "nameDesc",
] as const;

export type GlobalSearchResultsSort =
  (typeof GLOBAL_SEARCH_RESULTS_SORTS)[number];

interface GlobalSearchResultsUrlState {
  readonly q: string;
  readonly tab: GlobalSearchResultsTab;
  readonly sort: GlobalSearchResultsSort;
}

const ENTITY_TAB_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export function isGlobalSearchResultsStaticTab(
  value: string,
): value is GlobalSearchResultsStaticTab {
  return (GLOBAL_SEARCH_RESULTS_STATIC_TABS as readonly string[]).includes(
    value,
  );
}

function isTab(value: string | null): value is GlobalSearchResultsTab {
  if (value == null || value.trim().length === 0) {
    return false;
  }
  if (isGlobalSearchResultsStaticTab(value)) {
    return true;
  }
  return ENTITY_TAB_PATTERN.test(value);
}

function isSort(value: string | null): value is GlobalSearchResultsSort {
  return (
    value != null &&
    (GLOBAL_SEARCH_RESULTS_SORTS as readonly string[]).includes(value)
  );
}

export function readGlobalSearchResultsUrlState(
  params: URLSearchParams,
): GlobalSearchResultsUrlState {
  const tabParam = params.get("tab");
  const sortParam = params.get("sort");
  return {
    q: readListQuerySearch(params),
    tab: isTab(tabParam) ? tabParam : "all",
    sort: isSort(sortParam) ? sortParam : "relevance",
  };
}

export function writeGlobalSearchResultsUrlState(
  params: URLSearchParams,
  state: Partial<GlobalSearchResultsUrlState>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (state.q !== undefined) {
    writeListQuerySearch(next, state.q);
  }
  if (state.tab !== undefined) {
    if (state.tab === "all") {
      next.delete("tab");
    } else {
      next.set("tab", state.tab);
    }
  }
  if (state.sort !== undefined) {
    if (state.sort === "relevance") {
      next.delete("sort");
    } else {
      next.set("sort", state.sort);
    }
  }
  return next;
}

export function buildGlobalSearchResultsPath(
  state: Partial<GlobalSearchResultsUrlState>,
): string {
  const params = writeGlobalSearchResultsUrlState(new URLSearchParams(), {
    q: state.q ?? "",
    tab: state.tab ?? "all",
    sort: state.sort ?? "relevance",
  });
  const query = params.toString();
  return query.length > 0 ? `/search?${query}` : "/search";
}
