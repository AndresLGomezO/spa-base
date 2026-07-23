import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { EmailMatchBindingRecord } from "../../lib/api-client";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";
import { bindingDisplayName } from "./email-matching-draft";
import {
  DEFAULT_EMAIL_MATCHING_LIST_SORT,
  EMAIL_MATCHING_INGEST_MODE_FILTERS,
  EMAIL_MATCHING_STATUS_FILTERS,
  EMAIL_MATCHING_USE_AI_FILTERS,
  isEmailMatchingListSort,
  type EmailMatchingIngestModeFilter,
  type EmailMatchingListSort,
  type EmailMatchingStatusFilter,
  type EmailMatchingUseAiFilter,
} from "./email-matching-list-styles";

interface EmailMatchingListQuery {
  readonly search: string;
  readonly statuses: readonly EmailMatchingStatusFilter[];
  readonly entities: readonly string[];
  readonly ingestModes: readonly EmailMatchingIngestModeFilter[];
  readonly useAiFilters: readonly EmailMatchingUseAiFilter[];
  readonly sort: EmailMatchingListSort;
}

interface EmailMatchingListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseCsvFilter<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T[] {
  if (!raw?.trim()) {
    return [];
  }
  const allowedSet = new Set<string>(allowed);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is T => allowedSet.has(entry));
}

function parseEntities(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function bindingSearchHaystack(binding: EmailMatchBindingRecord): string {
  return [
    bindingDisplayName(binding),
    binding.description ?? "",
    binding.id,
    binding.entityName,
    binding.recordId,
    ...binding.fromAddresses,
  ]
    .join(" ")
    .toLowerCase();
}

function sortBindings(
  bindings: readonly EmailMatchBindingRecord[],
  sort: EmailMatchingListSort,
): EmailMatchBindingRecord[] {
  const sorted = [...bindings];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) =>
        bindingDisplayName(right).localeCompare(bindingDisplayName(left)),
      );
      break;
    case "entity":
      sorted.sort(
        (left, right) =>
          left.entityName.localeCompare(right.entityName) ||
          bindingDisplayName(left).localeCompare(bindingDisplayName(right)),
      );
      break;
    case "updatedDesc":
      sorted.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      break;
    case "orderAsc":
      sorted.sort(
        (left, right) =>
          (left.order ?? 100) - (right.order ?? 100) ||
          bindingDisplayName(left).localeCompare(bindingDisplayName(right)),
      );
      break;
    case "nameAsc":
    default:
      sorted.sort((left, right) =>
        bindingDisplayName(left).localeCompare(bindingDisplayName(right)),
      );
      break;
  }

  return sorted;
}

export function useEmailMatchingListQuery(
  bindings: readonly EmailMatchBindingRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const availableEntities = useMemo(() => {
    const names = new Set<string>();
    for (const binding of bindings) {
      names.add(binding.entityName);
    }
    return [...names].sort((left, right) => left.localeCompare(right));
  }, [bindings]);

  const query = useMemo((): EmailMatchingListQuery => {
    const rawSort =
      searchParams.get("sort") ?? DEFAULT_EMAIL_MATCHING_LIST_SORT;
    return {
      search: readListQuerySearch(searchParams),
      statuses: parseCsvFilter(
        searchParams.get("status"),
        EMAIL_MATCHING_STATUS_FILTERS,
      ),
      entities: parseEntities(searchParams.get("entity")),
      ingestModes: parseCsvFilter(
        searchParams.get("ingestMode"),
        EMAIL_MATCHING_INGEST_MODE_FILTERS,
      ),
      useAiFilters: parseCsvFilter(
        searchParams.get("useAi"),
        EMAIL_MATCHING_USE_AI_FILTERS,
      ),
      sort: isEmailMatchingListSort(rawSort)
        ? rawSort
        : DEFAULT_EMAIL_MATCHING_LIST_SORT,
    };
  }, [searchParams]);

  const updateSearchParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      updateSearchParams((next) => {
        writeListQuerySearch(next, search);
      });
    },
    [updateSearchParams],
  );

  const setSort = useCallback(
    (sort: EmailMatchingListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_EMAIL_MATCHING_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: EmailMatchingStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("status"),
          EMAIL_MATCHING_STATUS_FILTERS,
        );
        const updated = current.includes(status)
          ? current.filter((entry) => entry !== status)
          : [...current, status];
        if (updated.length === 0) {
          next.delete("status");
        } else {
          next.set("status", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleEntity = useCallback(
    (entity: string) => {
      updateSearchParams((next) => {
        const current = parseEntities(next.get("entity"));
        const updated = current.includes(entity)
          ? current.filter((entry) => entry !== entity)
          : [...current, entity];
        if (updated.length === 0) {
          next.delete("entity");
        } else {
          next.set("entity", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleIngestMode = useCallback(
    (mode: EmailMatchingIngestModeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("ingestMode"),
          EMAIL_MATCHING_INGEST_MODE_FILTERS,
        );
        const updated = current.includes(mode)
          ? current.filter((entry) => entry !== mode)
          : [...current, mode];
        if (updated.length === 0) {
          next.delete("ingestMode");
        } else {
          next.set("ingestMode", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleUseAi = useCallback(
    (filter: EmailMatchingUseAiFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("useAi"),
          EMAIL_MATCHING_USE_AI_FILTERS,
        );
        const updated = current.includes(filter)
          ? current.filter((entry) => entry !== filter)
          : [...current, filter];
        if (updated.length === 0) {
          next.delete("useAi");
        } else {
          next.set("useAi", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("status");
      next.delete("entity");
      next.delete("ingestMode");
      next.delete("useAi");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredBindings = useMemo(() => {
    const searchNeedle = query.search.trim().toLowerCase();

    return bindings.filter((binding) => {
      if (
        query.statuses.length > 0 &&
        !query.statuses.includes(binding.enabled ? "enabled" : "disabled")
      ) {
        return false;
      }
      if (
        query.entities.length > 0 &&
        !query.entities.includes(binding.entityName)
      ) {
        return false;
      }
      if (
        query.ingestModes.length > 0 &&
        !query.ingestModes.includes(binding.ingestMode ?? "create")
      ) {
        return false;
      }
      if (query.useAiFilters.length > 0) {
        const key: EmailMatchingUseAiFilter = binding.useAi ? "ai" : "rules";
        if (!query.useAiFilters.includes(key)) {
          return false;
        }
      }
      if (searchNeedle.length === 0) {
        return true;
      }
      return bindingSearchHaystack(binding).includes(searchNeedle);
    });
  }, [
    bindings,
    query.entities,
    query.ingestModes,
    query.search,
    query.statuses,
    query.useAiFilters,
  ]);

  const listBindings = useMemo(
    () => sortBindings(filteredBindings, query.sort),
    [filteredBindings, query.sort],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<EmailMatchingStatusFilter, number>> = {};
    for (const binding of filteredBindings) {
      const status: EmailMatchingStatusFilter = binding.enabled
        ? "enabled"
        : "disabled";
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [filteredBindings]);

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.statuses.length > 0 ||
    query.entities.length > 0 ||
    query.ingestModes.length > 0 ||
    query.useAiFilters.length > 0 ||
    query.sort !== DEFAULT_EMAIL_MATCHING_LIST_SORT;

  const activeFilterBadges = useMemo((): EmailMatchingListFilterBadge[] => {
    const badges: EmailMatchingListFilterBadge[] = [];

    if (query.search.trim().length > 0) {
      badges.push({
        id: "search",
        label: query.search.trim(),
        onRemove: () => setSearch(""),
      });
    }
    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }
    for (const entity of query.entities) {
      badges.push({
        id: `entity:${entity}`,
        label: entity,
        onRemove: () => toggleEntity(entity),
      });
    }
    for (const mode of query.ingestModes) {
      badges.push({
        id: `ingestMode:${mode}`,
        label: mode,
        onRemove: () => toggleIngestMode(mode),
      });
    }
    for (const filter of query.useAiFilters) {
      badges.push({
        id: `useAi:${filter}`,
        label: filter,
        onRemove: () => toggleUseAi(filter),
      });
    }
    if (query.sort !== DEFAULT_EMAIL_MATCHING_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_EMAIL_MATCHING_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.entities,
    query.ingestModes,
    query.search,
    query.sort,
    query.statuses,
    query.useAiFilters,
    setSearch,
    setSort,
    toggleEntity,
    toggleIngestMode,
    toggleStatus,
    toggleUseAi,
  ]);

  return {
    query,
    listBindings,
    filteredBindings,
    availableEntities,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleEntity,
    toggleIngestMode,
    toggleUseAi,
    clearFilters,
  };
}
