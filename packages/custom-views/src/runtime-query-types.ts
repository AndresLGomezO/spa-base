import type { FilterNode } from "@repo/entity-queries";

/** Toolbar/runtime query shape merged with saved entity query definitions. */
export interface RuntimeQueryFilter {
  readonly field: string;
  readonly operator: string;
  readonly value: unknown;
}

export interface RuntimeQuerySort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export interface RuntimeQueryConfig {
  readonly filter?: readonly RuntimeQueryFilter[] | FilterNode;
  readonly sort?: readonly RuntimeQuerySort[];
  readonly search?: string;
  readonly pagination?: {
    readonly limit: number;
    readonly cursor?: string;
    readonly offset?: number;
  };
  readonly select?: readonly string[];
}
