import { z } from "zod";

import {
  DATA_HOOK_JOB_OPERATIONS,
  isScheduleTrigger,
  type DataHookDefinition,
} from "./data-hook-definition.js";
import type { HookContext, HookUser } from "./types.js";

export const dataHookJobPayloadSchema = z.object({
  hookId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  phase: z.literal("after"),
  operation: z.enum(
    DATA_HOOK_JOB_OPERATIONS as unknown as [
      (typeof DATA_HOOK_JOB_OPERATIONS)[number],
      ...(typeof DATA_HOOK_JOB_OPERATIONS)[number][],
    ],
  ),
  current: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).optional(),
  user: z.object({
    uid: z.string().trim().min(1),
    email: z.string().nullable().optional(),
  }),
  depth: z.number().int().nonnegative(),
  visitedHookIds: z.array(z.string().trim().min(1)),
  triggerKind: z.enum(["crud", "schedule"]).optional(),
  executionId: z.string().trim().min(1).optional(),
});

export type DataHookJobPayload = z.infer<typeof dataHookJobPayloadSchema>;

export function buildDataHookJobPayload(
  definition: DataHookDefinition,
  context: HookContext,
  executionId?: string,
): DataHookJobPayload {
  const operation = isScheduleTrigger(definition.trigger)
    ? "schedule"
    : definition.trigger.operation;

  return {
    hookId: definition.id,
    tenantId: context.tenantId,
    entityName: context.entityName,
    phase: "after",
    operation,
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
    ...(isScheduleTrigger(definition.trigger)
      ? { triggerKind: "schedule" as const }
      : {}),
    ...(executionId ? { executionId } : {}),
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
