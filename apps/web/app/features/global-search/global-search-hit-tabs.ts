import { scoreGlobalSearchHit } from "./global-search-filter";
import type { GlobalSearchHit } from "./global-search-types";
import {
  isGlobalSearchResultsStaticTab,
  type GlobalSearchResultsSort,
  type GlobalSearchResultsTab,
} from "./global-search-results-url";

type GlobalSearchHitKind = "features" | "views" | "types" | "records";

export function getGlobalSearchHitTab(hit: GlobalSearchHit): string {
  if (hit.entityName) {
    return hit.entityName;
  }
  if (hit.section === "features") {
    return "features";
  }
  if (hit.section === "views") {
    return "views";
  }
  return "types";
}

export function getGlobalSearchHitKind(
  hit: GlobalSearchHit,
): GlobalSearchHitKind {
  if (hit.entityName) {
    return "records";
  }
  if (hit.section === "features") {
    return "features";
  }
  if (hit.section === "views") {
    return "views";
  }
  return "types";
}

export function filterHitsByTab(
  hits: readonly GlobalSearchHit[],
  tab: GlobalSearchResultsTab,
): readonly GlobalSearchHit[] {
  if (tab === "all") {
    return hits;
  }
  return hits.filter((hit) => getGlobalSearchHitTab(hit) === tab);
}

export function countHitsByTab(
  hits: readonly GlobalSearchHit[],
): Record<string, number> {
  const counts: Record<string, number> = {
    all: hits.length,
    features: 0,
    views: 0,
    types: 0,
  };
  for (const hit of hits) {
    const tab = getGlobalSearchHitTab(hit);
    counts[tab] = (counts[tab] ?? 0) + 1;
  }
  return counts;
}

export function visibleGlobalSearchResultsTabs(
  counts: Record<string, number>,
  hits: readonly GlobalSearchHit[] = [],
): readonly GlobalSearchResultsTab[] {
  if ((counts.all ?? 0) === 0) {
    return [];
  }
  const tabs: GlobalSearchResultsTab[] = ["all"];
  for (const tab of ["features", "views", "types"] as const) {
    if ((counts[tab] ?? 0) > 0) {
      tabs.push(tab);
    }
  }

  const entityTabs = new Map<string, string>();
  for (const hit of hits) {
    if (!hit.entityName) {
      continue;
    }
    if ((counts[hit.entityName] ?? 0) === 0) {
      continue;
    }
    if (!entityTabs.has(hit.entityName)) {
      entityTabs.set(hit.entityName, hit.description ?? hit.entityName);
    }
  }

  const sortedEntityTabs = [...entityTabs.keys()].sort((left, right) => {
    const leftLabel = entityTabs.get(left) ?? left;
    const rightLabel = entityTabs.get(right) ?? right;
    return leftLabel.localeCompare(rightLabel);
  });
  tabs.push(...sortedEntityTabs);
  return tabs;
}

export function sortGlobalSearchHits(
  hits: readonly GlobalSearchHit[],
  sort: GlobalSearchResultsSort,
  query: string,
): readonly GlobalSearchHit[] {
  const next = [...hits];
  if (sort === "nameAsc") {
    return next.sort((left, right) => left.label.localeCompare(right.label));
  }
  if (sort === "nameDesc") {
    return next.sort((left, right) => right.label.localeCompare(left.label));
  }
  return next.sort((left, right) => {
    const scoreDelta =
      scoreGlobalSearchHit(left, query) - scoreGlobalSearchHit(right, query);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.label.localeCompare(right.label);
  });
}

export function resolveActiveGlobalSearchTab(
  tab: GlobalSearchResultsTab,
  counts: Record<string, number>,
): GlobalSearchResultsTab {
  if ((counts.all ?? 0) === 0) {
    return "all";
  }
  if (tab !== "all" && (counts[tab] ?? 0) === 0) {
    return "all";
  }
  if (
    !isGlobalSearchResultsStaticTab(tab) &&
    tab !== "all" &&
    (counts[tab] ?? 0) === 0
  ) {
    return "all";
  }
  return tab;
}

export function resolveGlobalSearchTabLabel(options: {
  readonly tab: GlobalSearchResultsTab;
  readonly hits: readonly GlobalSearchHit[];
  readonly translateStatic: (
    tab: "all" | "features" | "views" | "types",
  ) => string;
}): string {
  if (
    options.tab === "all" ||
    options.tab === "features" ||
    options.tab === "views" ||
    options.tab === "types"
  ) {
    return options.translateStatic(options.tab);
  }
  const sample = options.hits.find((hit) => hit.entityName === options.tab);
  return sample?.description ?? options.tab;
}
