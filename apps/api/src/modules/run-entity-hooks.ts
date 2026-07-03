import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecorder,
  DataHookJobPayload,
  DataHookWebhookRequest,
  HookEntityServices,
  HookOperation,
  HookPhase,
} from "@repo/hooks";

import type { FormulaRuntimeContext } from "../formulas/formula-runtime-context.js";
import { dispatchChainedEntityHooks } from "../hooks/dispatch-chained-entity-hooks.js";
import { createTenantHookLogger } from "../hooks/create-tenant-hook-logger.js";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type { UserNotificationRepository } from "@repo/firestore-converters";
import { measureHooksTiming } from "../observability/request-timing.js";
import { createSendUserNotification } from "../notifications/create-send-user-notification.js";

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
  readonly recordDataHookExecution?: (
    entry: CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
  readonly hookLogMessageRepository?: HookLogMessageRepository;
  readonly userNotificationRepository?: UserNotificationRepository;
  readonly formulaRuntime?: FormulaRuntimeContext;
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

  return measureHooksTiming(request, async () => {
    const formulaResolver = params.formulaRuntime
      ? await params.formulaRuntime.getFormulaResolver(ctx.tenantId)
      : undefined;

    return dispatchChainedEntityHooks({
      tenantId: ctx.tenantId,
      entityName: params.entityName,
      phase: params.phase,
      operation: params.operation,
      current: params.current,
      ...(params.previous ? { previous: params.previous } : {}),
      depth: params.depth ?? 0,
      visitedHookIds: params.visitedHookIds ?? new Set<string>(),
      user: { uid: ctx.uid },
      logger: createTenantHookLogger(
        app,
        ctx.tenantId,
        params.hookLogMessageRepository,
      ),
      ...(params.entityServices
        ? { entityServices: params.entityServices }
        : {}),
      ...(params.enqueueDataHookJob
        ? { enqueueDataHookJob: params.enqueueDataHookJob }
        : {}),
      ...(params.recordDataHookExecution
        ? { recordDataHookExecution: params.recordDataHookExecution }
        : {}),
      ...(params.dataHookExecutionRecorder
        ? { dataHookExecutionRecorder: params.dataHookExecutionRecorder }
        : {}),
      ...(params.callWebhook ? { callWebhook: params.callWebhook } : {}),
      ...(params.userNotificationRepository
        ? {
            sendUserNotification: createSendUserNotification(
              params.userNotificationRepository,
              ctx.tenantId,
            ),
          }
        : {}),
      ...(formulaResolver ? { formulaResolver } : {}),
    });
  });
}
