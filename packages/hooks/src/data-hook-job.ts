import { z } from "zod";

import { DATA_HOOK_OPERATIONS } from "./data-hook-definition.js";
import type { DataHookDefinition } from "./data-hook-definition.js";
import type { HookContext, HookUser } from "./types.js";

export const dataHookJobPayloadSchema = z.object({
  hookId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  phase: z.literal("after"),
  operation: z.enum(DATA_HOOK_OPERATIONS),
  current: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).optional(),
  user: z.object({
    uid: z.string().trim().min(1),
    email: z.string().nullable().optional(),
  }),
  depth: z.number().int().nonnegative(),
  visitedHookIds: z.array(z.string().trim().min(1)),
});

export type DataHookJobPayload = z.infer<typeof dataHookJobPayloadSchema>;

export function buildDataHookJobPayload(
  definition: DataHookDefinition,
  context: HookContext,
): DataHookJobPayload {
  return {
    hookId: definition.id,
    tenantId: context.tenantId,
    entityName: context.entityName,
    phase: "after",
    operation: definition.trigger.operation,
    current: { ...context.current },
    ...(context.previous ? { previous: { ...context.previous } } : {}),
    user: {
      uid: context.user.uid,
      ...(context.user.email !== undefined
        ? { email: context.user.email }
        : {}),
    },
    depth: context.depth ?? 0,
    visitedHookIds: [...(context.visitedHookIds ?? [])],
  };
}

export function dataHookJobPayloadToUser(
  payload: DataHookJobPayload,
): HookUser {
  return {
    uid: payload.user.uid,
    ...(payload.user.email !== undefined ? { email: payload.user.email } : {}),
  };
}
