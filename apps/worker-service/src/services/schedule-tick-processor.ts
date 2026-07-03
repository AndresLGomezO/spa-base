import {
  buildScheduledHookContext,
  buildSyntheticScheduledRecord,
  getScheduleScope,
  isScheduleTrigger,
  listDueScheduledHooks,
  listMatchingRecordsForWhere,
  MAX_SCHEDULED_RECORDS_PER_RUN,
  runDataHook,
  type HookLogger,
} from "@repo/hooks";
import { listAllTenantIds, type FirebaseAdminConfig } from "@repo/gcp-firebase";
import { getAllKnownPermissions } from "@repo/rbac";

import { PermanentHookTaskError } from "./data-hook-processor.js";
import type { DataHookProcessorDeps } from "./data-hook-processor.js";
import { processExpiredTenantArchivePurge } from "./tenant-deletion-processor.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "../hooks/record-data-hook-execution.js";
import {
  buildHookEntityServices,
  resolveHookUserContext,
} from "../hooks/worker-hook-entity-services.js";

export async function processScheduleTick(
  deps: DataHookProcessorDeps & {
    readonly firebaseAdminConfig: FirebaseAdminConfig;
    readonly indexProjectId: string;
    readonly indexDatabaseId?: string;
  },
  options: {
    readonly firebaseAdminConfig: FirebaseAdminConfig;
    readonly scheduledHookUserUid: string;
    readonly at: Date;
    readonly logger: HookLogger;
  },
): Promise<void> {
  const uid = options.scheduledHookUserUid.trim();
  if (!uid) {
    throw new PermanentHookTaskError("SCHEDULED_HOOK_USER_UID_MISSING");
  }

  const purgeResult = await processExpiredTenantArchivePurge({
    firebaseAdminConfig: options.firebaseAdminConfig,
    indexProjectId: deps.indexProjectId,
    indexDatabaseId: deps.indexDatabaseId,
  });
  if (purgeResult.purged > 0 || purgeResult.failed > 0) {
    options.logger.info("Tenant archive purge tick completed.", {
      purged: purgeResult.purged,
      failed: purgeResult.failed,
    });
  }

  const tenantIds = await listAllTenantIds(options.firebaseAdminConfig);
  for (const tenantId of tenantIds) {
    await processTenantScheduleTick(deps, {
      tenantId,
      scheduledHookUserUid: uid,
      at: options.at,
      logger: options.logger,
    });
  }
}

async function processTenantScheduleTick(
  deps: DataHookProcessorDeps,
  options: {
    readonly tenantId: string;
    readonly scheduledHookUserUid: string;
    readonly at: Date;
    readonly logger: HookLogger;
  },
): Promise<void> {
  await deps.entityRuntime.ensureTenantEntitiesLoaded(options.tenantId);
  await deps.hookRuntime.ensureTenantHooksLoaded(options.tenantId);

  const definitions = await deps.hookRuntime.repository.list(options.tenantId);
  const dueHooks = listDueScheduledHooks(definitions, options.at);
  if (dueHooks.length === 0) {
    return;
  }

  const user = await resolveHookUserContext(
    options.tenantId,
    options.scheduledHookUserUid,
    deps.permissionDeps,
    {
      getKnownPermissions: (tenantId) => getAllKnownPermissions(tenantId),
    },
  );

  const formulaResolver = await deps.formulaRuntime.getFormulaResolver(
    options.tenantId,
  );

  const entities = buildHookEntityServices({
    user,
    deps,
    logger: options.logger,
    formulaResolver,
  });

  const recordDataHookExecution = deps.hookExecutionRepository
    ? createRecordDataHookExecution(
        deps.hookExecutionRepository,
        options.tenantId,
      )
    : undefined;
  const dataHookExecutionRecorder = deps.hookExecutionRepository
    ? createDataHookExecutionRecorderForTenant(
        deps.hookExecutionRepository,
        options.tenantId,
      )
    : undefined;

  const services = {
    logger: options.logger,
    entities,
    ...(recordDataHookExecution ? { recordDataHookExecution } : {}),
    ...(dataHookExecutionRecorder ? { dataHookExecutionRecorder } : {}),
    ...(deps.callWebhook ? { callWebhook: deps.callWebhook } : {}),
  };

  const withFormulaResolver = (
    context: ReturnType<typeof buildScheduledHookContext>,
  ) => ({
    ...context,
    formulaResolver,
  });

  for (const definition of dueHooks) {
    if (!isScheduleTrigger(definition.trigger)) {
      continue;
    }

    const scope = getScheduleScope(definition.trigger);

    if (scope === "once") {
      const context = buildScheduledHookContext({
        definition,
        tenantId: options.tenantId,
        user: { uid: options.scheduledHookUserUid },
        at: options.at,
        current: buildSyntheticScheduledRecord(options.tenantId, options.at),
        services,
      });
      await runDataHook(definition, withFormulaResolver(context));
      continue;
    }

    const eachRecordWhere = definition.trigger.eachRecordWhere;
    if (!eachRecordWhere) {
      continue;
    }

    const listContext = buildScheduledHookContext({
      definition,
      tenantId: options.tenantId,
      user: { uid: options.scheduledHookUserUid },
      at: options.at,
      current: buildSyntheticScheduledRecord(options.tenantId, options.at),
      services,
    });

    const listScope = {
      current: listContext.current,
      ...(listContext.previous ? { previous: listContext.previous } : {}),
      now: options.at,
      ...(listContext.user.uid ? { userId: listContext.user.uid } : {}),
    };

    const matches = await listMatchingRecordsForWhere(
      definition.entity,
      eachRecordWhere,
      listContext,
      listScope,
      entities.list,
    );

    const capped = matches.slice(0, MAX_SCHEDULED_RECORDS_PER_RUN);
    if (matches.length > capped.length) {
      options.logger.error("Scheduled hook record fan-out truncated.", {
        tenantId: options.tenantId,
        hookId: definition.id,
        matched: matches.length,
        limit: MAX_SCHEDULED_RECORDS_PER_RUN,
      });
    }

    for (const record of capped) {
      const recordData = record as Record<string, unknown>;
      const context = buildScheduledHookContext({
        definition,
        tenantId: options.tenantId,
        user: { uid: options.scheduledHookUserUid },
        at: options.at,
        current: recordData,
        previous: { ...recordData },
        services,
      });
      await runDataHook(definition, withFormulaResolver(context));
    }
  }
}
