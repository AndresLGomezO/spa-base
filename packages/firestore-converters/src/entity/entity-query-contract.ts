export type FilterOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "array-contains";

export interface NormalizedFilter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export interface NormalizedSort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export interface NormalizedEntityQuery {
  readonly filters: readonly NormalizedFilter[];
  readonly sort: NormalizedSort | null;
  readonly limit: number;
  readonly cursor?: string;
  readonly select?: readonly string[];
}

export interface EntityQueryExecutor {
  executeQuery(
    tenantId: string,
    query: NormalizedEntityQuery,
  ): Promise<{
    readonly items: readonly Record<string, unknown>[];
    readonly nextCursor: string | null;
  }>;
  findById(
    id: string,
    tenantId: string,
  ): Promise<Record<string, unknown> | null>;
}
