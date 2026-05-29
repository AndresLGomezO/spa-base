import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  executeHooks,
  formatHookEvent,
  type HookContext,
  type HookEntityServices,
  type HookOperation,
  type HookPhase,
} from "@repo/hooks";

interface RunEntityHooksParams {
  readonly entityName: string;
  readonly phase: HookPhase;
  readonly operation: HookOperation;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly entityServices?: HookEntityServices;
}

export async function runEntityHooks(
  app: FastifyInstance,
  request: FastifyRequest,
  params: RunEntityHooksParams,
): Promise<Record<string, unknown>> {
  const ctx = request.ctx;
  if (!ctx?.uid || !ctx.tenantId) {
    return params.current;
  }

  const event = formatHookEvent({
    entity: params.entityName,
    phase: params.phase,
    operation: params.operation,
  });

  const hookContext: HookContext = {
    tenantId: ctx.tenantId,
    entityName: params.entityName,
    event,
    current: { ...params.current },
    ...(params.previous ? { previous: { ...params.previous } } : {}),
    user: {
      uid: ctx.uid,
    },
    services: {
      logger: {
        info: (message, meta) => app.log.info(meta ?? {}, message),
        error: (message, meta) => app.log.error(meta ?? {}, message),
      },
      ...(params.entityServices ? { entities: params.entityServices } : {}),
    },
  };

  await executeHooks(event, hookContext);
  return hookContext.current;
}
