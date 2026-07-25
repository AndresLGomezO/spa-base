import type { CreateUserNotificationInput } from "@repo/user-notifications";

import type { DataHookDefinition } from "./data-hook-definition.js";
import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecorder,
} from "./data-hook-execution.js";
import type { DataHookJobPayload } from "./data-hook-job.js";
import type { ExpressionValue } from "./expression.js";

export const HOOK_OPERATIONS = [
  "create",
  "update",
  "delete",
  "schedule",
  "email",
] as const;
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

/** Equality lookup value; keep number/boolean so Firestore typed fields match. */
export type HookEntityListQueryValue = string | number | boolean;

export interface HookEntityListQuery {
  readonly field: string;
  readonly value: HookEntityListQueryValue;
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
    options?: { readonly skipExistsCheck?: boolean },
  ): Promise<HookEntityRepositoryRecord>;
  createMany(
    tenantId: string,
    records: readonly HookEntityRepositoryRecord[],
  ): Promise<readonly HookEntityRepositoryRecord[]>;
  findById(
    id: string,
    tenantId: string,
  ): Promise<HookEntityRepositoryRecord | null>;
  update(
    id: string,
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<HookEntityRepositoryRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
  findByField(query: {
    tenantId: string;
    field: string;
    value: HookEntityListQueryValue;
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
  invalidateInMemoryListSnapshot?(tenantId: string, entityName: string): void;
}

export interface HookEntityServices {
  readonly create: (
    entityName: string,
    data: Record<string, unknown>,
    options?: HookEntityWriteOptions,
  ) => Promise<Record<string, unknown>>;
  readonly createMany: (
    entityName: string,
    records: readonly Record<string, unknown>[],
    options?: HookEntityWriteOptions,
  ) => Promise<readonly Record<string, unknown>[]>;
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
  readonly delete: (
    entityName: string,
    id: string,
    options?: HookEntityWriteOptions,
  ) => Promise<boolean>;
  readonly get: (
    entityName: string,
    id: string,
  ) => Promise<Record<string, unknown>>;
}

export interface HookLogger {
  readonly info: (message: string, meta?: Record<string, unknown>) => void;
  readonly error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface DataHookWebhookRequest {
  readonly url: string;
  readonly body: Record<string, unknown>;
}

export interface DataHookAiRequest {
  readonly prompt: string;
  readonly systemInstruction?: string;
  readonly includeEntities?: readonly string[];
  readonly tenantId: string;
  /**
   * Optional memo/batch key (e.g. normalized merchant text). Identical keys
   * within a schedule tick share one model call.
   */
  readonly cacheKey?: string;
  /** Observability metadata for unified AI job tracing. */
  readonly hookId?: string;
  readonly hookName?: string;
  readonly hookExecutionId?: string;
  readonly recordId?: string;
  readonly entityName?: string;
}

export interface DataHookEmbeddingRequest {
  readonly text: string;
  readonly tenantId?: string;
  readonly hookId?: string;
  readonly hookExecutionId?: string;
  readonly recordId?: string;
  readonly entityName?: string;
}

export interface HookServices {
  readonly logger?: HookLogger;
  readonly entities?: HookEntityServices;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
  readonly recordDataHookExecution?: (
    entry: CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
  /**
   * Invoke a structured AI completion and return parsed JSON as a record.
   * Used by the `callAi` action; typically wired only on worker-service.
   */
  readonly callAi?: (
    request: DataHookAiRequest,
  ) => Promise<Record<string, unknown>>;
  /**
   * Embed text into a numeric vector. Used by `computeEmbedding` and
   * `matchSimilarRecord`.
   */
  readonly computeEmbedding?: (
    request: DataHookEmbeddingRequest,
  ) => Promise<readonly number[]>;
  readonly sendUserNotification?: (
    input: CreateUserNotificationInput,
  ) => Promise<void>;
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
  /**
   * Records loaded by `getRecord` / `getOrCreateRecord` / `matchRelatedRecord`
   * / `callAi` during this hook run, keyed by alias. `null` means the action
   * resolved without a record (e.g. empty lookup, no alias match, or skipped AI).
   */
  loaded?: Record<string, Record<string, unknown> | null>;
  /**
   * Scalars computed by `aggregateMatching` actions during this hook run, keyed by alias.
   */
  aggregates?: Record<string, ExpressionValue>;
  /**
   * Resolves tenant and platform formulas referenced by expression `formula` nodes.
   */
  formulaResolver?: import("./expression.js").FormulaResolver;
  /**
   * Per-run write and action instrumentation populated by `runDataHook`.
   */
  executionInstrumentation?: {
    readonly writeMetrics: import("./hook-execution-metrics.js").HookWriteMetricsCollector;
    readonly actionTrace: import("./hook-execution-metrics.js").DataHookActionTraceEntry[];
  };
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

/** Internal signal: end the hook run as skipped (not an error). */
export class DataHookSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataHookSkipError";
  }
}
