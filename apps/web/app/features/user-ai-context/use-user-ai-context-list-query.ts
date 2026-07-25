import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { AiContextSectionRecord } from "../../lib/api-client";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";
import {
  DEFAULT_USER_AI_CONTEXT_LIST_SORT,
  USER_AI_CONTEXT_BLOCK_KIND_FILTERS,
  USER_AI_CONTEXT_SCOPE_FILTERS,
  USER_AI_CONTEXT_STATUS_FILTERS,
  isUserAiContextListSort,
  type UserAiContextBlockKindFilter,
  type UserAiContextListSort,
  type UserAiContextScopeFilter,
  type UserAiContextStatusFilter,
} from "./user-ai-context-list-styles";

interface UserAiContextListQuery {
  readonly search: string;
  readonly entities: readonly string[];
  readonly blockKinds: readonly UserAiContextBlockKindFilter[];
  readonly statuses: readonly UserAiContextStatusFilter[];
  readonly scopes: readonly UserAiContextScopeFilter[];
  readonly sort: UserAiContextListSort;
}

function parseCsv<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T[] {
  if (!raw?.trim()) return [];
  const allowedSet = new Set<string>(allowed);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is T => allowedSet.has(entry));
}

function parseEntities(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function sectionEntities(section: AiContextSectionRecord): string[] {
  const names = new Set<string>();
  for (const block of section.blocks) {
    if (block.kind === "entityField" || block.kind === "entityRecordsSummary") {
      names.add(block.entityName);
    }
  }
  return [...names];
}

function sectionSearchHaystack(section: AiContextSectionRecord): string {
  return [
    section.name,
    section.description ?? "",
    section.id,
    ...sectionEntities(section),
    ...section.blocks.map((block) => block.kind),
  ]
    .join(" ")
    .toLowerCase();
}

function sortSections(
  sections: readonly AiContextSectionRecord[],
  sort: UserAiContextListSort,
): AiContextSectionRecord[] {
  const sorted = [...sections];
  switch (sort) {
    case "nameAsc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "nameDesc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "updatedDesc":
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
    case "order":
    default:
      sorted.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      break;
  }
  return sorted;
}

export function useUserAiContextListQuery(
  definitions: readonly AiContextSectionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): UserAiContextListQuery => {
    const rawSort =
      searchParams.get("sort") ?? DEFAULT_USER_AI_CONTEXT_LIST_SORT;
    return {
      search: readListQuerySearch(searchParams),
      entities: parseEntities(searchParams.get("entity")),
      blockKinds: parseCsv(
        searchParams.get("blockKind"),
        USER_AI_CONTEXT_BLOCK_KIND_FILTERS,
      ),
      statuses: parseCsv(
        searchParams.get("status"),
        USER_AI_CONTEXT_STATUS_FILTERS,
      ),
      scopes: parseCsv(
        searchParams.get("scope"),
        USER_AI_CONTEXT_SCOPE_FILTERS,
      ),
      sort: isUserAiContextListSort(rawSort)
        ? rawSort
        : DEFAULT_USER_AI_CONTEXT_LIST_SORT,
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
      updateSearchParams((next) => writeListQuerySearch(next, search));
    },
    [updateSearchParams],
  );

  const setSort = useCallback(
    (sort: UserAiContextListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_USER_AI_CONTEXT_LIST_SORT) next.delete("sort");
        else next.set("sort", sort);
      });
    },
    [updateSearchParams],
  );

  const toggleCsv = useCallback(
    (key: string, value: string, current: readonly string[]) => {
      updateSearchParams((next) => {
        const exists = current.includes(value);
        const updated = exists
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        if (updated.length === 0) next.delete(key);
        else next.set(key, updated.join(","));
      });
    },
    [updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("entity");
      next.delete("blockKind");
      next.delete("status");
      next.delete("scope");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const availableEntities = useMemo(() => {
    const names = new Set<string>();
    for (const section of definitions) {
      for (const name of sectionEntities(section)) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [definitions]);

  const filteredDefinitions = useMemo(() => {
    const needle = query.search.trim().toLowerCase();
    return definitions.filter((section) => {
      if (
        query.statuses.length > 0 &&
        !query.statuses.includes(section.enabled ? "enabled" : "disabled")
      ) {
        return false;
      }
      if (query.scopes.length > 0 && !query.scopes.includes(section.scope)) {
        return false;
      }
      if (query.blockKinds.length > 0) {
        const kinds = new Set(section.blocks.map((block) => block.kind));
        if (!query.blockKinds.some((kind) => kinds.has(kind))) return false;
      }
      if (query.entities.length > 0) {
        const entities = new Set(sectionEntities(section));
        if (!query.entities.some((entity) => entities.has(entity))) {
          return false;
        }
      }
      if (needle.length === 0) return true;
      return sectionSearchHaystack(section).includes(needle);
    });
  }, [definitions, query]);

  const listDefinitions = useMemo(
    () => sortSections(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.entities.length > 0 ||
    query.blockKinds.length > 0 ||
    query.statuses.length > 0 ||
    query.scopes.length > 0 ||
    query.sort !== DEFAULT_USER_AI_CONTEXT_LIST_SORT;

  const activeFilterBadges = useMemo(() => {
    const badges: {
      readonly id: string;
      readonly label: string;
      readonly onRemove: () => void;
    }[] = [];
    if (query.search.trim()) {
      badges.push({
        id: "search",
        label: query.search.trim(),
        onRemove: () => setSearch(""),
      });
    }
    for (const entity of query.entities) {
      badges.push({
        id: `entity:${entity}`,
        label: entity,
        onRemove: () => toggleCsv("entity", entity, query.entities),
      });
    }
    for (const kind of query.blockKinds) {
      badges.push({
        id: `blockKind:${kind}`,
        label: kind,
        onRemove: () => toggleCsv("blockKind", kind, query.blockKinds),
      });
    }
    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleCsv("status", status, query.statuses),
      });
    }
    for (const scope of query.scopes) {
      badges.push({
        id: `scope:${scope}`,
        label: scope,
        onRemove: () => toggleCsv("scope", scope, query.scopes),
      });
    }
    if (query.sort !== DEFAULT_USER_AI_CONTEXT_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_USER_AI_CONTEXT_LIST_SORT),
      });
    }
    return badges;
  }, [query, setSearch, setSort, toggleCsv]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    availableEntities,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleEntity: (entity: string) =>
      toggleCsv("entity", entity, query.entities),
    toggleBlockKind: (kind: UserAiContextBlockKindFilter) =>
      toggleCsv("blockKind", kind, query.blockKinds),
    toggleStatus: (status: UserAiContextStatusFilter) =>
      toggleCsv("status", status, query.statuses),
    toggleScope: (scope: UserAiContextScopeFilter) =>
      toggleCsv("scope", scope, query.scopes),
    clearFilters,
  };
}
