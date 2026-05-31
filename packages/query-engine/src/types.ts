import type { FilterOperator } from "@repo/firestore-converters";

export type { FilterOperator };

export interface Filter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export interface Sort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export interface QueryConfig {
  readonly filter?: readonly Filter[];
  readonly sort?: readonly Sort[];
  readonly pagination?: {
    readonly limit: number;
    readonly cursor?: string;
    readonly offset?: number;
  };
  readonly select?: readonly string[];
}

export interface QueryContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin?: boolean;
}

export interface QueryResult {
  readonly data: readonly Record<string, unknown>[];
  readonly nextCursor?: string;
  readonly totalCount: number;
}

export interface ListQueryInput {
  readonly limit?: number;
  readonly cursor?: string;
  readonly query?: string;
}

export interface RbacQueryInjector {
  injectFilters(entityName: string, context: QueryContext): readonly Filter[];
}

export interface RecordAccessChecker {
  assertCanRead(
    entityName: string,
    record: Record<string, unknown>,
    context: QueryContext,
  ): void;
}

export interface RelationIncludeResolver {
  expand(
    entityName: string,
    records: readonly Record<string, unknown>[],
    include: readonly string[],
    context: QueryContext,
  ): Promise<readonly Record<string, unknown>[]>;
}
