import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Search } from "lucide-react";

import {
  BuilderPageShell,
  IconButton,
  PageLoader,
  SearchField,
  SegmentedSwitch,
  Text,
} from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { buildGlobalSearchQueryHit } from "./build-global-search-query-hit";
import { useGlobalSearchRecent } from "./use-global-search-recent";
import { useGlobalSearchResults } from "./use-global-search-results";
import {
  countHitsByTab,
  filterHitsByTab,
  resolveActiveGlobalSearchTab,
  resolveGlobalSearchTabLabel,
  sortGlobalSearchHits,
  visibleGlobalSearchResultsTabs,
} from "./global-search-hit-tabs";
import {
  readGlobalSearchResultsUrlState,
  writeGlobalSearchResultsUrlState,
  type GlobalSearchResultsSort,
  type GlobalSearchResultsTab,
} from "./global-search-results-url";
import {
  GLOBAL_SEARCH_RESULTS_RECORD_LIMIT,
  type GlobalSearchHit,
} from "./global-search-types";
import { GlobalSearchResultsList } from "./GlobalSearchResultsList";

function GlobalSearchResultsPageContent() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const { remember } = useGlobalSearchRecent();

  const urlState = useMemo(
    () => readGlobalSearchResultsUrlState(searchParams),
    [searchParams],
  );

  const [draftQuery, setDraftQuery] = useState(urlState.q);

  useEffect(() => {
    setDraftQuery(urlState.q);
  }, [urlState.q]);

  const { hits, isLoading } = useGlobalSearchResults({
    open: true,
    query: urlState.q,
    recordLimit: GLOBAL_SEARCH_RESULTS_RECORD_LIMIT,
  });

  const counts = useMemo(() => countHitsByTab(hits), [hits]);
  const visibleTabs = useMemo(
    () => visibleGlobalSearchResultsTabs(counts, hits),
    [counts, hits],
  );
  const activeTab = resolveActiveGlobalSearchTab(urlState.tab, counts);

  useEffect(() => {
    if (activeTab === urlState.tab) {
      return;
    }
    setSearchParams(
      (prev) =>
        writeGlobalSearchResultsUrlState(prev, {
          tab: activeTab,
        }),
      { replace: true },
    );
  }, [activeTab, setSearchParams, urlState.tab]);

  const filteredHits = useMemo(() => {
    const byTab = filterHitsByTab(hits, activeTab);
    return sortGlobalSearchHits(byTab, urlState.sort, urlState.q);
  }, [activeTab, hits, urlState.q, urlState.sort]);

  const updateUrl = useCallback(
    (patch: {
      q?: string;
      tab?: GlobalSearchResultsTab;
      sort?: GlobalSearchResultsSort;
    }) => {
      setSearchParams((prev) => writeGlobalSearchResultsUrlState(prev, patch), {
        replace: false,
      });
    },
    [setSearchParams],
  );

  const submitQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const queryHit = buildGlobalSearchQueryHit(trimmed);
      if (queryHit) {
        remember(queryHit);
      }
      updateUrl({ q: trimmed, tab: "all" });
    },
    [remember, updateUrl],
  );

  const handleHitNavigate = useCallback(
    (hit: GlobalSearchHit) => {
      remember(hit);
    },
    [remember],
  );

  const tabOptions = useMemo(
    () =>
      visibleTabs.map((tab) => {
        const label = resolveGlobalSearchTabLabel({
          tab,
          hits,
          translateStatic: (staticTab) => {
            switch (staticTab) {
              case "all":
                return t("globalSearch.results.tabs.all");
              case "features":
                return t("globalSearch.results.tabs.features");
              case "views":
                return t("globalSearch.results.tabs.views");
              case "types":
                return t("globalSearch.results.tabs.types");
            }
          },
        });
        const count = counts[tab] ?? 0;
        return {
          value: tab,
          label: `${label} (${count})`,
          ariaLabel: `${label} (${count})`,
        };
      }),
    [counts, hits, t, visibleTabs],
  );

  const sortControl = (
    <label className="text-muted-foreground flex items-center gap-2 text-sm">
      <span>{t("globalSearch.results.sortLabel")}</span>
      <select
        className="border-border bg-background text-foreground rounded-md border px-2 py-1.5 text-sm"
        value={urlState.sort}
        onChange={(event) =>
          updateUrl({
            sort: event.target.value as GlobalSearchResultsSort,
          })
        }
        aria-label={t("globalSearch.results.sortLabel")}
        data-testid="global-search-results-sort"
      >
        <option value="relevance">
          {t("globalSearch.results.sort.relevance")}
        </option>
        <option value="nameAsc">
          {t("globalSearch.results.sort.nameAsc")}
        </option>
        <option value="nameDesc">
          {t("globalSearch.results.sort.nameDesc")}
        </option>
      </select>
    </label>
  );

  return (
    <BuilderPageShell title={t("globalSearch.results.pageTitle")}>
      <div className="space-y-6" data-testid="global-search-results-page">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            value={draftQuery}
            onChange={setDraftQuery}
            onSubmit={submitQuery}
            placeholder={t("globalSearch.placeholder")}
            ariaLabel={t("globalSearch.placeholder")}
            clearAriaLabel={t("dataView.searchClear")}
            debounceMs={0}
            className="max-w-none min-w-0 w-full flex-1"
          />
          <IconButton
            type="button"
            size="sm"
            label={t("globalSearch.results.submitAria")}
            onClick={() => submitQuery(draftQuery)}
            data-testid="global-search-results-submit"
          >
            <Search className="size-4" aria-hidden />
          </IconButton>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {tabOptions.length > 0 ? (
            <SegmentedSwitch
              value={activeTab}
              onChange={(tab) => updateUrl({ tab })}
              options={tabOptions}
              ariaLabel={t("globalSearch.results.tabsAria")}
            />
          ) : (
            <span />
          )}
          {sortControl}
        </div>

        <GlobalSearchResultsList
          hits={filteredHits}
          isLoading={isLoading}
          hasQuery={urlState.q.trim().length > 0}
          onHitNavigate={handleHitNavigate}
        />
      </div>
    </BuilderPageShell>
  );
}

export function GlobalSearchResultsPage() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return <GlobalSearchResultsPageContent />;
}
