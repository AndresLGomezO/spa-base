import type { DataHookDefinition } from "./data-hook-definition.js";

export const HOOK_PERMISSIONS = [
  "hook.read",
  "hook.create",
  "hook.update",
  "hook.delete",
] as const;

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

export interface HookEntityServices {
  readonly create: (
    entityName: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  readonly update: (
    entityName: string,
    id: string,
    data: Record<string, unknown>,
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
