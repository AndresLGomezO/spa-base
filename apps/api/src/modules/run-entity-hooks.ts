import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  DataHookJobPayload,
  HookEntityServices,
  HookOperation,
  HookPhase,
} from "@repo/hooks";

import { dispatchChainedEntityHooks } from "../hooks/dispatch-chained-entity-hooks.js";
import { measureHooksTiming } from "../observability/request-timing.js";

export interface RunEntityHooksParams {
  readonly entityName: string;
  readonly phase: HookPhase;
  readonly operation: HookOperation;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly entityServices?: HookEntityServices;
  readonly depth?: number;
  readonly visitedHookIds?: ReadonlySet<string>;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
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

  return measureHooksTiming(request, () =>
    dispatchChainedEntityHooks({
      tenantId: ctx.tenantId,
      entityName: params.entityName,
      phase: params.phase,
      operation: params.operation,
      current: params.current,
      ...(params.previous ? { previous: params.previous } : {}),
      depth: params.depth ?? 0,
      visitedHookIds: params.visitedHookIds ?? new Set<string>(),
      user: { uid: ctx.uid },
      logger: {
        info: (message, meta) => app.log.info(meta ?? {}, message),
        error: (message, meta) => app.log.error(meta ?? {}, message),
      },
      ...(params.entityServices
        ? { entityServices: params.entityServices }
        : {}),
      ...(params.enqueueDataHookJob
        ? { enqueueDataHookJob: params.enqueueDataHookJob }
        : {}),
    }),
  );
}
