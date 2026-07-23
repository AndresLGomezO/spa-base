import { buildGlobalSearchResultsPath } from "./global-search-results-url";
import type { GlobalSearchHit } from "./global-search-types";

export function buildGlobalSearchQueryHit(
  query: string,
): GlobalSearchHit | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  return {
    id: `query:${trimmed.toLocaleLowerCase()}`,
    section: "queries",
    label: trimmed,
    to: buildGlobalSearchResultsPath({ q: trimmed }),
    iconName: "Search",
  };
}
