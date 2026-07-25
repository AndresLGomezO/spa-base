import { formatHookEvent } from "./event.js";
import type { DataHookDefinition } from "./data-hook-definition.js";
import type { DataHookExecutionRecorder } from "./data-hook-execution.js";
import type { DataHookJobPayload } from "./data-hook-job.js";
import type { FormulaResolver } from "./expression.js";
import { runDataHook } from "./interpret-data-hook.js";
import type {
  HookContext,
  HookLogger,
  HookEntityServices,
  HookServices,
} from "./types.js";
import { dataHookJobPayloadToUser } from "./data-hook-job.js";

export async function runQueuedDataHookJob(
  definition: DataHookDefinition,
  payload: DataHookJobPayload,
  services: {
    readonly entities: HookEntityServices;
    readonly logger?: HookLogger;
    readonly recordDataHookExecution?: HookServices["recordDataHookExecution"];
    readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
    readonly callWebhook?: HookServices["callWebhook"];
    readonly callAi?: HookServices["callAi"];
    readonly computeEmbedding?: HookServices["computeEmbedding"];
    readonly computeRecordAiSummary?: HookServices["computeRecordAiSummary"];
    readonly upsertAiRecordContext?: HookServices["upsertAiRecordContext"];
    readonly enqueueAiRecordNarrative?: HookServices["enqueueAiRecordNarrative"];
    readonly invalidateAiRecordNarratives?: HookServices["invalidateAiRecordNarratives"];
    readonly sendUserNotification?: HookServices["sendUserNotification"];
    readonly formulaResolver?: FormulaResolver;
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
    ...(services.formulaResolver
      ? { formulaResolver: services.formulaResolver }
      : {}),
    services: {
      logger: services.logger,
      entities: services.entities,
      ...(services.recordDataHookExecution
        ? { recordDataHookExecution: services.recordDataHookExecution }
        : {}),
      ...(services.dataHookExecutionRecorder
        ? { dataHookExecutionRecorder: services.dataHookExecutionRecorder }
        : {}),
      ...(services.callWebhook ? { callWebhook: services.callWebhook } : {}),
      ...(services.callAi ? { callAi: services.callAi } : {}),
      ...(services.computeEmbedding
        ? { computeEmbedding: services.computeEmbedding }
        : {}),
      ...(services.computeRecordAiSummary
        ? { computeRecordAiSummary: services.computeRecordAiSummary }
        : {}),
      ...(services.upsertAiRecordContext
        ? { upsertAiRecordContext: services.upsertAiRecordContext }
        : {}),
      ...(services.enqueueAiRecordNarrative
        ? { enqueueAiRecordNarrative: services.enqueueAiRecordNarrative }
        : {}),
      ...(services.invalidateAiRecordNarratives
        ? {
            invalidateAiRecordNarratives: services.invalidateAiRecordNarratives,
          }
        : {}),
      ...(services.sendUserNotification
        ? { sendUserNotification: services.sendUserNotification }
        : {}),
    },
  };

  await runDataHook(definition, context, {
    executionId: payload.executionId,
  });
}
