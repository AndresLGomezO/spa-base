import { existsSync } from "node:fs";

import { createPersistingHookLogger } from "@repo/debug-logs";
import {
  createFirestoreAdminDataHookExecutionRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminFormulaDefinitionRepository,
  createFirestoreAdminHookLogMessageRepository,
  createFirestoreAdminUserNotificationRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { createHookEntityAccessControl } from "@repo/rbac";
import {
  createHookEntityServices,
  type CreateDataHookExecutionInput,
  type DataHookExecutionRecorder,
  type HookLogger,
} from "@repo/hooks";
import type { CreateUserNotificationInput } from "@repo/user-notifications";

import type { EntityRuntimeForCrudHooks } from "../../hooks/crud-hook-deps.types.js";
import { apiEnv } from "../../config/env.js";
import { createFormulaRuntimeContext } from "../../formulas/formula-runtime-context.js";
import { dispatchChainedEntityHooks } from "../../hooks/dispatch-chained-entity-hooks.js";
import { createHookTasksClient } from "../../hooks/hook-tasks.client.js";
import { createHookRuntimeContext } from "../../hooks/hook-runtime-context.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "../../hooks/record-data-hook-execution.js";
import { createSendUserNotification } from "../../notifications/create-send-user-notification.js";

function isInsideDocker(): boolean {
  return existsSync("/.dockerenv");
}

function normalizeWorkerServiceUrl(url: string): string {
  if (isInsideDocker()) {
    return url;
  }
  return url.replace("worker-service:", "127.0.0.1:");
}

const seedHookConsoleLogger: HookLogger = {
  info(message, meta) {
    if (meta && Object.keys(meta).length > 0) {
      console.log(`[seed hooks] ${message}`, meta);
      return;
    }
    console.log(`[seed hooks] ${message}`);
  },
  error(message, meta) {
    if (meta?.error) {
      console.error(`[seed hooks] ${message} — ${meta.error}`);
      return;
    }
    if (meta && Object.keys(meta).length > 0) {
      console.error(`[seed hooks] ${message}`, meta);
      return;
    }
    console.error(`[seed hooks] ${message}`);
  },
};

export interface SeedHookObservabilityServices {
  readonly logger: HookLogger;
  readonly recordDataHookExecution?: (
    entry: CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
  readonly sendUserNotification?: (
    input: CreateUserNotificationInput,
  ) => Promise<void>;
}

export function buildSeedHookObservabilityServices(options: {
  readonly observabilityEnabled: boolean;
  readonly tenantId: string;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
}): SeedHookObservabilityServices {
  if (!options.observabilityEnabled) {
    return { logger: seedHookConsoleLogger };
  }

  const hookExecutionRepository =
    createFirestoreAdminDataHookExecutionRepository(
      options.firebaseAdminConfig,
    );
  const hookLogMessageRepository = createFirestoreAdminHookLogMessageRepository(
    options.firebaseAdminConfig,
  );
  const userNotificationRepository =
    createFirestoreAdminUserNotificationRepository(options.firebaseAdminConfig);

  return {
    logger: createPersistingHookLogger({
      base: seedHookConsoleLogger,
      repository: hookLogMessageRepository,
      tenantId: options.tenantId,
    }),
    recordDataHookExecution: createRecordDataHookExecution(
      hookExecutionRepository,
      options.tenantId,
    ),
    dataHookExecutionRecorder: createDataHookExecutionRecorderForTenant(
      hookExecutionRepository,
      options.tenantId,
    ),
    sendUserNotification: createSendUserNotification(
      userNotificationRepository,
      options.tenantId,
    ),
  };
}

export interface SeedHookRunner {
  runAfterCreateHooks(
    entityName: string,
    record: Record<string, unknown>,
  ): Promise<void>;
}

export async function createSeedHookRunner(options: {
  readonly tenantId: string;
  readonly ownerUserId: string;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly observabilityEnabled: boolean;
}): Promise<SeedHookRunner> {
  const hookRepository = createFirestoreAdminDataHookRepository(
    options.firebaseAdminConfig,
  );
  const hookRuntime = createHookRuntimeContext(hookRepository);
  await hookRuntime.ensureTenantHooksLoaded(options.tenantId);

  const formulaRuntime = createFormulaRuntimeContext(
    createFirestoreAdminFormulaDefinitionRepository(
      options.firebaseAdminConfig,
    ),
  );
  const formulaResolver = await formulaRuntime.getFormulaResolver(
    options.tenantId,
  );

  const observability = buildSeedHookObservabilityServices({
    observabilityEnabled: options.observabilityEnabled,
    tenantId: options.tenantId,
    firebaseAdminConfig: options.firebaseAdminConfig,
  });
  const { logger } = observability;

  const hookTasksClient = createHookTasksClient({
    projectId: apiEnv.GCP_PROJECT_ID,
    region: apiEnv.GCP_REGION,
    queueName: apiEnv.HOOK_TASKS_QUEUE_NAME,
    workerBaseUrl: normalizeWorkerServiceUrl(apiEnv.WORKER_SERVICE_URL),
    ...(apiEnv.TASKS_SA_EMAIL
      ? { serviceAccountEmail: apiEnv.TASKS_SA_EMAIL }
      : {}),
    localDispatch: apiEnv.HOOK_TASKS_LOCAL_DISPATCH,
  });
  const enqueueDataHookJob =
    hookTasksClient.enqueueDataHookJob.bind(hookTasksClient);

  const accessControl = createHookEntityAccessControl({
    permissions: [],
    isSuperAdmin: true,
    tenantId: options.tenantId,
  });

  const buildDispatchParams = (
    params: Parameters<typeof dispatchChainedEntityHooks>[0],
  ) => ({
    ...params,
    ...(observability.recordDataHookExecution
      ? {
          recordDataHookExecution: observability.recordDataHookExecution,
        }
      : {}),
    ...(observability.dataHookExecutionRecorder
      ? {
          dataHookExecutionRecorder: observability.dataHookExecutionRecorder,
        }
      : {}),
    ...(observability.sendUserNotification
      ? { sendUserNotification: observability.sendUserNotification }
      : {}),
    enqueueDataHookJob,
  });

  const entityServices = createHookEntityServices({
    entityRuntime: options.entityRuntime,
    accessControl,
    tenantId: options.tenantId,
    ownerUserId: options.ownerUserId,
    dispatchChainedHooks: (params) =>
      dispatchChainedEntityHooks(
        buildDispatchParams({
          tenantId: options.tenantId,
          entityName: params.entityName,
          phase: params.phase,
          operation: params.operation,
          current: params.current,
          ...(params.previous ? { previous: params.previous } : {}),
          depth: params.depth,
          visitedHookIds: params.visitedHookIds,
          user: { uid: options.ownerUserId },
          logger,
          entityServices,
          formulaResolver,
        }),
      ),
  });

  return {
    async runAfterCreateHooks(entityName, record) {
      await dispatchChainedEntityHooks(
        buildDispatchParams({
          tenantId: options.tenantId,
          entityName,
          phase: "after",
          operation: "create",
          current: { ...record },
          depth: 0,
          visitedHookIds: new Set<string>(),
          user: { uid: options.ownerUserId },
          logger,
          entityServices,
          formulaResolver,
        }),
      );
    },
  };
}
