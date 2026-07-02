import {
  executeHooks,
  formatHookEvent,
  type CreateDataHookExecutionInput,
  type DataHookExecutionRecorder,
  type DataHookJobPayload,
  type DataHookWebhookRequest,
  type HookEntityServices,
  type HookLogger,
  type HookOperation,
  type HookPhase,
  type HookUser,
} from "@repo/hooks";

interface DispatchChainedEntityHooksParams {
  readonly tenantId: string;
  readonly entityName: string;
  readonly phase: HookPhase;
  readonly operation: HookOperation;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly depth: number;
  readonly visitedHookIds: ReadonlySet<string>;
  readonly user: HookUser;
  readonly logger: HookLogger;
  readonly entityServices?: HookEntityServices;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
  readonly recordDataHookExecution?: (
    entry: CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
}

export async function dispatchChainedEntityHooks(
  params: DispatchChainedEntityHooksParams,
): Promise<Record<string, unknown>> {
  const event = formatHookEvent({
    entity: params.entityName,
    phase: params.phase,
    operation: params.operation,
  });

  const hookContext = {
    tenantId: params.tenantId,
    entityName: params.entityName,
    event,
    current: { ...params.current },
    ...(params.previous ? { previous: { ...params.previous } } : {}),
    user: params.user,
    depth: params.depth,
    visitedHookIds: params.visitedHookIds,
    services: {
      logger: params.logger,
      ...(params.entityServices ? { entities: params.entityServices } : {}),
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
    },
  };

  await executeHooks(event, hookContext);
  return hookContext.current;
}
