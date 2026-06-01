import { useMemo } from "react";
import type { QueryConfig, Filter, Sort } from "@repo/query-engine";
import type { DataViewSortState } from "@repo/data-view";

import { resolveServerFilterValue } from "./resolve-server-filter-value";

interface ServerQueryConfigInput {
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly limit: number;
  readonly offset?: number;
  readonly cursor?: string;
  readonly fieldTypes?: Readonly<Record<string, string>>;
}

function buildServerQueryConfig(input: ServerQueryConfigInput): QueryConfig {
  const queryFilters: Filter[] = [];

  for (const [columnId, values] of Object.entries(input.filters)) {
    if (values.length === 0) continue;

    const fieldType = input.fieldTypes?.[columnId];
    const coercedValues = values.map((value) =>
      resolveServerFilterValue(fieldType, value),
    );

    if (coercedValues.length === 1) {
      queryFilters.push({
        field: columnId,
        operator: "==",
        value: coercedValues[0],
      });
    } else {
      queryFilters.push({
        field: columnId,
        operator: "in",
        value: coercedValues,
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
      ...(input.offset !== undefined && input.offset > 0
        ? { offset: input.offset }
        : input.cursor
          ? { cursor: input.cursor }
          : {}),
    },
  };
}

export function useServerQueryConfig(
  input: ServerQueryConfigInput,
): QueryConfig {
  const { search, filters, sort, limit, offset, cursor, fieldTypes } = input;

  return useMemo(
    () =>
      buildServerQueryConfig({
        search,
        filters,
        sort,
        limit,
        offset,
        cursor,
        fieldTypes,
      }),
    [search, filters, sort, limit, offset, cursor, fieldTypes],
  );
}
