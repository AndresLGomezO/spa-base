import { SearchField, Spinner, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

import { GlobalSearchResultRow } from "./GlobalSearchResultRow";
import {
  GLOBAL_SEARCH_RECENT_VISIBLE,
  GLOBAL_SEARCH_SECTIONS,
} from "./global-search-types";
import type {
  GlobalSearchCatalogSection,
  GlobalSearchHit,
  GlobalSearchRecentEntry,
} from "./global-search-types";

interface GlobalSearchPanelProps {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onQuerySubmit?: (value: string) => void;
  readonly recent: readonly GlobalSearchRecentEntry[];
  readonly isLoading: boolean;
  readonly topResults: readonly GlobalSearchHit[];
  readonly bySection: Record<
    GlobalSearchCatalogSection,
    readonly GlobalSearchHit[]
  >;
  readonly onSelect: (hit: GlobalSearchHit) => void;
  readonly onRemoveRecent?: (hitId: string) => void;
  readonly showQueryField?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
}

function sectionTitleKey(
  section: GlobalSearchCatalogSection,
):
  | "globalSearch.sections.entities"
  | "globalSearch.sections.features"
  | "globalSearch.sections.views" {
  switch (section) {
    case "entities":
      return "globalSearch.sections.entities";
    case "features":
      return "globalSearch.sections.features";
    case "views":
      return "globalSearch.sections.views";
  }
}

function SectionBlock({
  title,
  hits,
  onSelect,
  onRemove,
  testId,
}: {
  readonly title: string;
  readonly hits: readonly GlobalSearchHit[];
  readonly onSelect: (hit: GlobalSearchHit) => void;
  readonly onRemove?: (hitId: string) => void;
  readonly testId: string;
}) {
  if (hits.length === 0) {
    return null;
  }

  return (
    <section data-testid={testId} className="flex flex-col gap-1">
      <Text className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </Text>
      <ul className="flex flex-col">
        {hits.map((hit) => (
          <li key={hit.id}>
            <GlobalSearchResultRow
              hit={hit}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EntitiesSection({
  hits,
  showRecordSubgroups,
  onSelect,
}: {
  readonly hits: readonly GlobalSearchHit[];
  readonly showRecordSubgroups: boolean;
  readonly onSelect: (hit: GlobalSearchHit) => void;
}) {
  const { t } = useTranslation("common");
  const typeHits = hits.filter((hit) => hit.entityName == null);
  const recordHitsByEntity = new Map<string, GlobalSearchHit[]>();
  if (showRecordSubgroups) {
    for (const hit of hits) {
      if (!hit.entityName) {
        continue;
      }
      const existing = recordHitsByEntity.get(hit.entityName) ?? [];
      existing.push(hit);
      recordHitsByEntity.set(hit.entityName, existing);
    }
  }

  const entitySubgroups = [...recordHitsByEntity.entries()].sort(
    ([, leftHits], [, rightHits]) => {
      const leftLabel = leftHits[0]?.description ?? "";
      const rightLabel = rightHits[0]?.description ?? "";
      return leftLabel.localeCompare(rightLabel);
    },
  );

  if (typeHits.length === 0 && entitySubgroups.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="global-search-section-entities"
      className="flex flex-col gap-3"
    >
      <Text className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
        {t("globalSearch.sections.entities")}
      </Text>
      <div className="flex flex-col gap-3 pl-1">
        <SectionBlock
          title={t("globalSearch.entitySubgroups.types")}
          hits={typeHits}
          onSelect={onSelect}
          testId="global-search-entities-types"
        />
        {entitySubgroups.map(([entityName, entityHits]) => (
          <SectionBlock
            key={entityName}
            title={entityHits[0]?.description ?? entityName}
            hits={entityHits}
            onSelect={onSelect}
            testId={`global-search-entities-${entityName}`}
          />
        ))}
      </div>
    </section>
  );
}

export function GlobalSearchPanel({
  query,
  onQueryChange,
  onQuerySubmit,
  recent,
  isLoading,
  topResults,
  bySection,
  onSelect,
  onRemoveRecent,
  showQueryField = false,
  placeholder,
  className,
}: GlobalSearchPanelProps) {
  const { t } = useTranslation("common");
  const resolvedPlaceholder =
    placeholder?.trim() || t("globalSearch.placeholder");
  const hasQuery = query.trim().length > 0;
  const topIds = new Set(topResults.map((hit) => hit.id));
  const recentVisible = recent.slice(0, GLOBAL_SEARCH_RECENT_VISIBLE);

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-4", className)}
      data-testid="global-search-panel"
    >
      {showQueryField ? (
        <SearchField
          value={query}
          onChange={onQueryChange}
          onSubmit={onQuerySubmit}
          placeholder={resolvedPlaceholder}
          ariaLabel={resolvedPlaceholder}
          clearAriaLabel={t("dataView.searchClear")}
          debounceMs={0}
          className="max-w-none min-w-0 w-full"
        />
      ) : null}

      <SectionBlock
        title={t("globalSearch.recent")}
        hits={recentVisible}
        onSelect={onSelect}
        onRemove={onRemoveRecent}
        testId="global-search-recent"
      />

      {isLoading ? (
        <div
          className="flex items-center gap-2 px-2 py-3"
          data-testid="global-search-loading"
        >
          <Spinner size="sm" ariaLabel={t("globalSearch.loading")} />
          <Text className="text-muted-foreground text-sm">
            {t("globalSearch.loading")}
          </Text>
        </div>
      ) : (
        <>
          <SectionBlock
            title={t("globalSearch.topResults")}
            hits={topResults}
            onSelect={onSelect}
            testId="global-search-top-results"
          />
          {GLOBAL_SEARCH_SECTIONS.map((section) => {
            const sectionHits = bySection[section].filter(
              (hit) => !topIds.has(hit.id),
            );
            if (section === "entities") {
              return (
                <EntitiesSection
                  key={section}
                  hits={sectionHits}
                  showRecordSubgroups={hasQuery}
                  onSelect={onSelect}
                />
              );
            }
            return (
              <SectionBlock
                key={section}
                title={t(sectionTitleKey(section))}
                hits={sectionHits}
                onSelect={onSelect}
                testId={`global-search-section-${section}`}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
