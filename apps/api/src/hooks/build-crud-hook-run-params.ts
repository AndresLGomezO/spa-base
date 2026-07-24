import type { RunEntityHooksParams } from "../modules/run-entity-hooks.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "./record-data-hook-execution.js";
import type { CrudHookDeps } from "./crud-hook-deps.types.js";

export function buildCrudHookRunParams(
  crudHooks: CrudHookDeps | undefined,
  tenantId: string | undefined,
  params: RunEntityHooksParams,
): RunEntityHooksParams {
  return {
    ...params,
    ...(crudHooks?.enqueueDataHookJob
      ? { enqueueDataHookJob: crudHooks.enqueueDataHookJob }
      : {}),
    ...(crudHooks?.hookExecutionRepository && tenantId
      ? {
          recordDataHookExecution: createRecordDataHookExecution(
            crudHooks.hookExecutionRepository,
            tenantId,
          ),
          dataHookExecutionRecorder: createDataHookExecutionRecorderForTenant(
            crudHooks.hookExecutionRepository,
            tenantId,
          ),
        }
      : {}),
    ...(crudHooks?.callWebhook ? { callWebhook: crudHooks.callWebhook } : {}),
    ...(crudHooks?.hookLogMessageRepository
      ? { hookLogMessageRepository: crudHooks.hookLogMessageRepository }
      : {}),
    ...(crudHooks?.userNotificationRepository
      ? { userNotificationRepository: crudHooks.userNotificationRepository }
      : {}),
    ...(crudHooks?.pushTokenRepository
      ? { pushTokenRepository: crudHooks.pushTokenRepository }
      : {}),
    ...(crudHooks?.firebaseAdminConfig
      ? { firebaseAdminConfig: crudHooks.firebaseAdminConfig }
      : {}),
    ...(crudHooks?.formulaRuntime
      ? { formulaRuntime: crudHooks.formulaRuntime }
      : {}),
  };
}
