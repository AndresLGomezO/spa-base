import type { SerializableEntityDefinition } from "@repo/entities";
import type { Filter, QueryConfig, Sort } from "@repo/query-engine";

export interface FilterState {
  readonly field: string;
  readonly operator: Filter["operator"];
  readonly value: unknown;
}

export function buildSortConfig(sort: Sort | null | undefined): QueryConfig {
  if (!sort) return {};
  return { sort: [sort] };
}

export function buildFilterConfig(
  filters: readonly FilterState[],
): QueryConfig {
  if (filters.length === 0) return {};
  return {
    filter: filters.map((entry) => ({
      field: entry.field,
      operator: entry.operator,
      value: entry.value,
    })),
  };
}

export function mergeQueryConfig(
  ...configs: readonly QueryConfig[]
): QueryConfig {
  return configs.reduce<QueryConfig>(
    (merged, config) => ({
      filter: [...(merged.filter ?? []), ...(config.filter ?? [])],
      sort: config.sort ?? merged.sort,
      pagination: config.pagination ?? merged.pagination,
      select: config.select ?? merged.select,
    }),
    {},
  );
}

const DEFAULT_OPERATORS: Record<string, Filter["operator"]> = {
  string: "==",
  number: "==",
  boolean: "==",
  date: "==",
  relation: "==",
};

export function getDefaultFilterOperator(
  definition: SerializableEntityDefinition,
  fieldName: string,
): Filter["operator"] {
  const field = definition.fields[fieldName];
  if (!field) return "==";
  return DEFAULT_OPERATORS[field.type] ?? "==";
}

export function buildListQueryConfig(params: {
  readonly filters?: readonly FilterState[];
  readonly sort?: Sort | null;
  readonly limit?: number;
  readonly cursor?: string;
}): QueryConfig {
  return mergeQueryConfig(
    buildFilterConfig(params.filters ?? []),
    buildSortConfig(params.sort ?? undefined),
    {
      pagination: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    },
  );
}
