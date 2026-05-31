import { useMemo } from "react";
import type { QueryConfig, Filter, Sort } from "@repo/query-engine";
import type { DataViewSortState } from "@repo/data-view";

interface ServerQueryConfigInput {
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly limit: number;
  readonly cursor?: string;
}

function buildServerQueryConfig(input: ServerQueryConfigInput): QueryConfig {
  const queryFilters: Filter[] = [];

  for (const [columnId, values] of Object.entries(input.filters)) {
    if (values.length === 0) continue;

    if (values.length === 1) {
      queryFilters.push({
        field: columnId,
        operator: "==",
        value: values[0],
      });
    } else {
      queryFilters.push({
        field: columnId,
        operator: "in",
        value: [...values],
      });
    }
  }

  const sortEntries: Sort[] = [];
  if (input.sort.columnId) {
    sortEntries.push({
      field: input.sort.columnId,
      direction: input.sort.direction,
    });
  }

  return {
    ...(queryFilters.length > 0 ? { filter: queryFilters } : {}),
    ...(sortEntries.length > 0 ? { sort: sortEntries } : {}),
    ...(input.search.trim().length > 0 ? { search: input.search.trim() } : {}),
    pagination: {
      limit: input.limit,
      ...(input.cursor ? { cursor: input.cursor } : {}),
    },
  };
}

export function useServerQueryConfig(
  input: ServerQueryConfigInput,
): QueryConfig {
  const { search, filters, sort, limit, cursor } = input;

  return useMemo(
    () => buildServerQueryConfig({ search, filters, sort, limit, cursor }),
    [search, filters, sort, limit, cursor],
  );
}
