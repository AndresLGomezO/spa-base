import type { DataHookDefinition } from "./data-hook-definition.js";
import type { DataHookJobPayload } from "./data-hook-job.js";

export const HOOK_OPERATIONS = ["create", "update", "delete"] as const;
export const HOOK_PHASES = ["before", "after"] as const;

export type HookOperation = (typeof HOOK_OPERATIONS)[number];
export type HookPhase = (typeof HOOK_PHASES)[number];

export interface ParsedHookEvent {
  readonly entity: string;
  readonly operation: HookOperation;
  readonly phase: HookPhase;
}

export interface HookUser {
  readonly uid: string;
  readonly email?: string | null;
}

export interface HookEntityRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
}

export interface HookEntityListQuery {
  readonly field: string;
  readonly value: string;
  readonly limit?: number;
}

export interface HookEntityWriteOptions {
  readonly chainHooks?: boolean;
  readonly depth?: number;
  readonly visitedHookIds?: ReadonlySet<string>;
}

import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

export interface HookEntityRepositoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
}

export interface HookEntityRepository {
  create(
    tenantId: string,
    record: HookEntityRepositoryRecord,
  ): Promise<HookEntityRepositoryRecord>;
  findById(
    id: string,
    tenantId: string,
  ): Promise<HookEntityRepositoryRecord | null>;
  update(
    id: string,
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<HookEntityRepositoryRecord | null>;
  findByField(query: {
    tenantId: string;
    field: string;
    value: string;
    limit?: number;
  }): Promise<{ readonly items: readonly HookEntityRepositoryRecord[] }>;
}

export interface HookEntityRuntime {
  resolveEntity(
    name: string,
    tenantId: string,
  ): DefinedEntity<string, FieldDefinitions> | undefined;
  getRepository(
    tenantId: string,
    entityName: string,
  ): HookEntityRepository | undefined;
}

export interface HookEntityServices {
  readonly create: (
    entityName: string,
    data: Record<string, unknown>,
    options?: HookEntityWriteOptions,
  ) => Promise<Record<string, unknown>>;
  readonly update: (
    entityName: string,
    id: string,
    data: Record<string, unknown>,
    options?: HookEntityWriteOptions,
  ) => Promise<Record<string, unknown>>;
  readonly list: (
    entityName: string,
    query: HookEntityListQuery,
  ) => Promise<readonly HookEntityRecord[]>;
}

export interface HookLogger {
  readonly info: (message: string, meta?: Record<string, unknown>) => void;
  readonly error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface HookServices {
  readonly logger?: HookLogger;
  readonly entities?: HookEntityServices;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
}

export interface HookContext {
  readonly tenantId: string;
  readonly entityName: string;
  readonly event: string;
  current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly user: HookUser;
  readonly services: HookServices;
  /**
   * Re-entrancy depth. Incremented when hook-initiated writes trigger further
   * hooks (opt-in nested execution). Used to guard against infinite loops.
   */
  readonly depth?: number;
  /**
   * Hook definition ids already executed in this chain. Prevents the same hook
   * from re-firing when chained writes loop back.
   */
  readonly visitedHookIds?: ReadonlySet<string>;
}

export type HookHandler = (context: HookContext) => Promise<void> | void;

export interface RegisteredSystemHook {
  readonly source: "system";
  readonly moduleName: string;
  readonly event: string;
  readonly handler: HookHandler;
  readonly order: number;
}

export interface RegisteredDynamicHook {
  readonly source: "dynamic";
  readonly tenantId: string;
  readonly definition: DataHookDefinition;
  readonly handler: HookHandler;
  readonly order: number;
}

export type RegisteredHook = RegisteredSystemHook | RegisteredDynamicHook;

export class HookExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HookExecutionError";
  }
}
