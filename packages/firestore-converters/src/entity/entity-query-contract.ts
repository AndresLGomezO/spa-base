export type FirestoreNativeOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "array-contains";

export type PostFilterOperator = "contains" | "startsWith" | "endsWith";

export type FilterOperator = FirestoreNativeOperator | PostFilterOperator;

export const POST_FILTER_OPERATORS = new Set<FilterOperator>([
  "contains",
  "startsWith",
  "endsWith",
]);

export function isPostFilterOperator(
  op: FilterOperator,
): op is PostFilterOperator {
  return POST_FILTER_OPERATORS.has(op);
}

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
  readonly postFilters: readonly NormalizedFilter[];
  readonly sort: NormalizedSort | null;
  readonly limit: number;
  readonly cursor?: string;
  readonly offset?: number;
  readonly select?: readonly string[];
  readonly search?: string;
  readonly searchField?: string;
}

export interface EntityQueryExecutor {
  executeQuery(
    tenantId: string,
    query: NormalizedEntityQuery,
  ): Promise<{
    readonly items: readonly Record<string, unknown>[];
    readonly nextCursor: string | null;
    readonly totalCount: number;
  }>;
  findById(
    id: string,
    tenantId: string,
  ): Promise<Record<string, unknown> | null>;
}
