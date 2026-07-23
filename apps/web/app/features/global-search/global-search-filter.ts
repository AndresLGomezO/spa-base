import type {
  GlobalSearchCatalogSection,
  GlobalSearchHit,
} from "./global-search-types";

export function filterGlobalSearchHits(
  query: string,
  hits: readonly GlobalSearchHit[],
): readonly GlobalSearchHit[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return hits;
  }

  return hits.filter((hit) => {
    const haystack = [hit.label, hit.description ?? "", hit.to]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

/** Lower score = better match for Top Results. */
export function scoreGlobalSearchHit(
  hit: GlobalSearchHit,
  query: string,
): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return 99;
  }

  const label = hit.label.toLowerCase();
  if (label === normalized) {
    return 0;
  }
  if (label.startsWith(normalized)) {
    return 1;
  }
  if (label.includes(normalized)) {
    return 2;
  }

  const description = (hit.description ?? "").toLowerCase();
  if (description.includes(normalized)) {
    return 3;
  }

  const path = hit.to.toLowerCase();
  if (path.includes(normalized)) {
    return 4;
  }

  return 99;
}

export function pickTopGlobalSearchResults(
  hits: readonly GlobalSearchHit[],
  query: string,
  limit = 3,
): readonly GlobalSearchHit[] {
  if (hits.length === 0 || limit <= 0) {
    return [];
  }

  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  return [...hits]
    .sort((left, right) => {
      const scoreDelta =
        scoreGlobalSearchHit(left, normalized) -
        scoreGlobalSearchHit(right, normalized);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

export function groupGlobalSearchHitsBySection(
  hits: readonly GlobalSearchHit[],
): Record<GlobalSearchCatalogSection, readonly GlobalSearchHit[]> {
  return {
    entities: hits.filter((hit) => hit.section === "entities"),
    features: hits.filter((hit) => hit.section === "features"),
    views: hits.filter((hit) => hit.section === "views"),
  };
}
