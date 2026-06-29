export type FirestoreNativeOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "array-contains";

export type PostFilterOperator =
  | "contains"
  | "startsWith"
  | "endsWith"
  | "tokenStartsWith"
  | "sourceFieldsContain";

export type FilterOperator = FirestoreNativeOperator | PostFilterOperator;

export const POST_FILTER_OPERATORS = new Set<FilterOperator>([
  "contains",
  "startsWith",
  "endsWith",
  "tokenStartsWith",
  "sourceFieldsContain",
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

import type { NormalizedFilterNode } from "../filter-tree.js";

export interface NormalizedEntityQuery {
  /** Primary filter representation (AND/OR tree). */
  readonly filterTree: NormalizedFilterNode | null;
  /** Flat AND list derived from filterTree for ownership/index helpers. */
  readonly filters: readonly NormalizedFilter[];
  readonly postFilters: readonly NormalizedFilter[];
  readonly postFilterTree: NormalizedFilterNode | null;
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
