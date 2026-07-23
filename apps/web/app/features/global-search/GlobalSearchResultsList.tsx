import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { GlobalSearchResultsRow } from "./GlobalSearchResultsRow";
import type { GlobalSearchHit } from "./global-search-types";

interface GlobalSearchResultsListProps {
  readonly hits: readonly GlobalSearchHit[];
  readonly isLoading: boolean;
  readonly hasQuery: boolean;
  readonly onHitNavigate?: (hit: GlobalSearchHit) => void;
}

export function GlobalSearchResultsList({
  hits,
  isLoading,
  hasQuery,
  onHitNavigate,
}: GlobalSearchResultsListProps) {
  const { t } = useTranslation("common");

  if (isLoading && hits.length === 0) {
    return (
      <Text
        className="text-muted-foreground text-sm"
        data-testid="global-search-results-loading"
      >
        {t("globalSearch.loading")}
      </Text>
    );
  }

  if (!hasQuery) {
    return (
      <Text
        className="text-muted-foreground text-sm"
        data-testid="global-search-results-empty-query"
      >
        {t("globalSearch.results.emptyQuery")}
      </Text>
    );
  }

  if (hits.length === 0) {
    return (
      <Text
        className="text-muted-foreground text-sm"
        data-testid="global-search-results-empty"
      >
        {t("globalSearch.results.empty")}
      </Text>
    );
  }

  return (
    <ul
      className="border-border divide-border divide-y overflow-hidden rounded-lg border"
      data-testid="global-search-results-list"
    >
      {hits.map((hit) => (
        <GlobalSearchResultsRow
          key={hit.id}
          hit={hit}
          onNavigate={() => onHitNavigate?.(hit)}
        />
      ))}
    </ul>
  );
}
