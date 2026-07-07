import { useCallback, useMemo } from "react";
import { isScheduleTrigger } from "@repo/hooks";
import { useSearchParams } from "react-router";

import type { DataHookDefinitionRecord } from "../../lib/api-client";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";
import {
  DATA_HOOK_PHASE_FILTERS,
  DATA_HOOK_STATUS_FILTERS,
  DATA_HOOK_TRIGGER_KIND_FILTERS,
  DEFAULT_DATA_HOOK_LIST_SORT,
  dataHookSortLabelKey,
  isDataHookListSort,
  type DataHookListSort,
  type DataHookPhaseFilter,
  type DataHookStatusFilter,
  type DataHookTriggerKindFilter,
} from "./data-hook-list-styles";

interface DataHooksListFilterBadge {
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

function dataHookSearchHaystack(definition: DataHookDefinitionRecord): string {
  return [
    definition.name,
    definition.description ?? "",
    definition.id,
    definition.entity,
  ]
    .join(" ")
    .toLowerCase();
}

function definitionTriggerKind(
  definition: DataHookDefinitionRecord,
): DataHookTriggerKindFilter {
  return isScheduleTrigger(definition.trigger) ? "schedule" : "crud";
}

function definitionStatus(
  definition: DataHookDefinitionRecord,
): DataHookStatusFilter {
  return definition.enabled ? "enabled" : "disabled";
}

interface DataHooksListQueryState {
  readonly search: string;
  readonly entities: readonly string[];
  readonly phases: readonly DataHookPhaseFilter[];
  readonly triggerKinds: readonly DataHookTriggerKindFilter[];
  readonly statuses: readonly DataHookStatusFilter[];
  readonly sort: DataHookListSort;
}

export function buildDataHooksListQueryState(
  searchParams: URLSearchParams,
): DataHooksListQueryState {
  const rawSort = searchParams.get("sort") ?? DEFAULT_DATA_HOOK_LIST_SORT;
  return {
    search: readListQuerySearch(searchParams),
    entities: parseEntities(searchParams.get("entity")),
    phases: parseCsvFilter(searchParams.get("phase"), DATA_HOOK_PHASE_FILTERS),
    triggerKinds: parseCsvFilter(
      searchParams.get("triggerKind"),
      DATA_HOOK_TRIGGER_KIND_FILTERS,
    ),
    statuses: parseCsvFilter(
      searchParams.get("status"),
      DATA_HOOK_STATUS_FILTERS,
    ),
    sort: isDataHookListSort(rawSort) ? rawSort : DEFAULT_DATA_HOOK_LIST_SORT,
  };
}

export function filterDataHookDefinitions(
  definitions: readonly DataHookDefinitionRecord[],
  query: DataHooksListQueryState,
): DataHookDefinitionRecord[] {
  const searchNeedle = query.search.trim().toLowerCase();

  return definitions.filter((definition) => {
    if (
      query.entities.length > 0 &&
      !query.entities.includes(definition.entity)
    ) {
      return false;
    }

    if (query.phases.length > 0 && !query.phases.includes(definition.phase)) {
      return false;
    }

    if (
      query.triggerKinds.length > 0 &&
      !query.triggerKinds.includes(definitionTriggerKind(definition))
    ) {
      return false;
    }

    if (
      query.statuses.length > 0 &&
      !query.statuses.includes(definitionStatus(definition))
    ) {
      return false;
    }

    if (searchNeedle.length === 0) {
      return true;
    }

    return dataHookSearchHaystack(definition).includes(searchNeedle);
  });
}

export function sortDataHookDefinitions(
  definitions: readonly DataHookDefinitionRecord[],
  sort: DataHookListSort,
): DataHookDefinitionRecord[] {
  const sorted = [...definitions];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "entity":
      sorted.sort(
        (left, right) =>
          left.entity.localeCompare(right.entity) ||
          left.order - right.order ||
          left.name.localeCompare(right.name),
      );
      break;
    case "order":
      sorted.sort(
        (left, right) =>
          left.entity.localeCompare(right.entity) ||
          left.order - right.order ||
          left.name.localeCompare(right.name),
      );
      break;
    case "updatedDesc":
      sorted.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      break;
    case "nameAsc":
    default:
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      break;
  }

  return sorted;
}

export function useDataHooksListQuery(
  definitions: readonly DataHookDefinitionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    (): DataHooksListQueryState => buildDataHooksListQueryState(searchParams),
    [searchParams],
  );

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
    (sort: DataHookListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_DATA_HOOK_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleEntity = useCallback(
    (entity: string) => {
      updateSearchParams((next) => {
        const current = parseEntities(next.get("entity"));
        const exists = current.includes(entity);
        const updated = exists
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

  const togglePhase = useCallback(
    (phase: DataHookPhaseFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("phase"),
          DATA_HOOK_PHASE_FILTERS,
        );
        const exists = current.includes(phase);
        const updated = exists
          ? current.filter((entry) => entry !== phase)
          : [...current, phase];

        if (updated.length === 0) {
          next.delete("phase");
        } else {
          next.set("phase", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleTriggerKind = useCallback(
    (triggerKind: DataHookTriggerKindFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("triggerKind"),
          DATA_HOOK_TRIGGER_KIND_FILTERS,
        );
        const exists = current.includes(triggerKind);
        const updated = exists
          ? current.filter((entry) => entry !== triggerKind)
          : [...current, triggerKind];

        if (updated.length === 0) {
          next.delete("triggerKind");
        } else {
          next.set("triggerKind", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: DataHookStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("status"),
          DATA_HOOK_STATUS_FILTERS,
        );
        const exists = current.includes(status);
        const updated = exists
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

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("entity");
      next.delete("phase");
      next.delete("triggerKind");
      next.delete("status");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredDefinitions = useMemo(
    () => filterDataHookDefinitions(definitions, query),
    [definitions, query],
  );

  const listDefinitions = useMemo(
    () => sortDataHookDefinitions(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const entityOptions = useMemo(() => {
    const entities = new Set<string>();
    for (const definition of definitions) {
      if (definition.entity.trim()) {
        entities.add(definition.entity);
      }
    }
    return [...entities].sort((left, right) => left.localeCompare(right));
  }, [definitions]);

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.entities.length > 0 ||
    query.phases.length > 0 ||
    query.triggerKinds.length > 0 ||
    query.statuses.length > 0 ||
    query.sort !== DEFAULT_DATA_HOOK_LIST_SORT;

  const activeFilterBadges = useMemo((): DataHooksListFilterBadge[] => {
    const badges: DataHooksListFilterBadge[] = [];

    if (query.search.trim().length > 0) {
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
        onRemove: () => toggleEntity(entity),
      });
    }

    for (const phase of query.phases) {
      badges.push({
        id: `phase:${phase}`,
        label: phase,
        onRemove: () => togglePhase(phase),
      });
    }

    for (const triggerKind of query.triggerKinds) {
      badges.push({
        id: `triggerKind:${triggerKind}`,
        label: triggerKind,
        onRemove: () => toggleTriggerKind(triggerKind),
      });
    }

    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }

    if (query.sort !== DEFAULT_DATA_HOOK_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_DATA_HOOK_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.entities,
    query.phases,
    query.search,
    query.sort,
    query.statuses,
    query.triggerKinds,
    setSearch,
    setSort,
    toggleEntity,
    togglePhase,
    toggleStatus,
    toggleTriggerKind,
  ]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleEntity,
    togglePhase,
    toggleTriggerKind,
    toggleStatus,
    clearFilters,
    dataHookSortLabelKey,
  };
}
