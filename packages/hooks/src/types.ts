import { z } from "zod";

export const HOOKS_COLLECTION = "hooks" as const;

export const HOOK_PERMISSIONS = [
  "hook.read",
  "hook.create",
  "hook.update",
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
  readonly record: HookRecord;
  readonly handler: HookHandler;
  readonly order: number;
}

export type RegisteredHook = RegisteredSystemHook | RegisteredDynamicHook;

export const hookActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("updateField"),
    field: z.string().trim().min(1),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("createRecord"),
    entity: z.string().trim().min(1),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("sendNotification"),
    message: z.string().trim().min(1),
  }),
]);

export type HookAction = z.infer<typeof hookActionSchema>;

export const hookRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  entity: z.string().trim().min(1),
  event: z.string().trim().min(1),
  type: z.literal("action"),
  config: z.object({
    actions: z.array(hookActionSchema).min(1),
  }),
  enabled: z.boolean(),
  order: z.number().int(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type HookRecord = z.infer<typeof hookRecordSchema>;

export const createHookInputSchema = hookRecordSchema
  .omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tenantId: z.string().trim().min(1).optional(),
    order: z.number().int().optional(),
    enabled: z.boolean().optional(),
  });

export type CreateHookInput = z.infer<typeof createHookInputSchema>;

export const patchHookInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  config: z
    .object({
      actions: z.array(hookActionSchema).min(1),
    })
    .optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

export type PatchHookInput = z.infer<typeof patchHookInputSchema>;

export class HookExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HookExecutionError";
  }
}
