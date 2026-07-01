import { formatHookEvent } from "./event.js";
import type { DataHookDefinition } from "./data-hook-definition.js";
import type { DataHookJobPayload } from "./data-hook-job.js";
import { runDataHook } from "./interpret-data-hook.js";
import type { HookContext, HookLogger, HookEntityServices } from "./types.js";
import { dataHookJobPayloadToUser } from "./data-hook-job.js";

export async function runQueuedDataHookJob(
  definition: DataHookDefinition,
  payload: DataHookJobPayload,
  services: {
    readonly entities: HookEntityServices;
    readonly logger?: HookLogger;
  },
): Promise<void> {
  const event = formatHookEvent({
    entity: payload.entityName,
    phase: payload.phase,
    operation: payload.operation,
  });

  const context: HookContext = {
    tenantId: payload.tenantId,
    entityName: payload.entityName,
    event,
    current: { ...payload.current },
    ...(payload.previous ? { previous: { ...payload.previous } } : {}),
    user: dataHookJobPayloadToUser(payload),
    depth: payload.depth,
    visitedHookIds: new Set(payload.visitedHookIds),
    services: {
      logger: services.logger,
      entities: services.entities,
    },
  };

  await runDataHook(definition, context);
}
