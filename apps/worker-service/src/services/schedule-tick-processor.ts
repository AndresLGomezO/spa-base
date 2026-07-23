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
  type HookServices,
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
import { createBatchedCallAi } from "../hooks/ai-call-batcher.js";
import { createBatchCallDataHookAi } from "../hooks/call-data-hook-ai.js";
import { vertexAiConfig, workerEnv } from "../config/env.js";

/**
 * Hard cap on parallel eachRecord runs when AI batching is enabled.
 * Local: 1 — Firestore emulator OOMs under concurrent categorize I/O.
 * Non-local: 2 — small fan-out; `aiBatchSize` still cannot exceed this.
 */
const MAX_SCHEDULE_EACH_RECORD_CONCURRENCY = workerEnv.IS_LOCAL ? 1 : 2;
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
    /** When true, run all enabled schedule hooks regardless of cron due-ness. */
    readonly force?: boolean;
    /**
     * Optional filter (name or id substring, case-insensitive). Useful with
     * `force` so one broken schedule hook does not block another.
     */
    readonly hookFilter?: string;
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
      ...(options.force ? { force: true } : {}),
      ...(options.hookFilter ? { hookFilter: options.hookFilter } : {}),
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
    readonly force?: boolean;
    readonly hookFilter?: string;
  },
): Promise<void> {
  await deps.entityRuntime.ensureTenantEntitiesLoaded(options.tenantId);
  await deps.hookRuntime.ensureTenantHooksLoaded(options.tenantId);

  const definitions = await deps.hookRuntime.repository.list(options.tenantId);
  const filter = options.hookFilter?.trim().toLowerCase();
  const dueHooks = listDueScheduledHooks(definitions, options.at, {
    force: options.force === true,
  }).filter((definition) => {
    if (!filter) {
      return true;
    }
    return (
      definition.name.toLowerCase().includes(filter) ||
      definition.id.toLowerCase().includes(filter)
    );
  });
  if (dueHooks.length === 0) {
    options.logger.info("No scheduled hooks due for tenant.", {
      tenantId: options.tenantId,
      at: options.at.toISOString(),
      force: options.force === true,
      ...(filter ? { hookFilter: filter } : {}),
    });
    return;
  }

  options.logger.info("Running scheduled hooks for tenant.", {
    tenantId: options.tenantId,
    hookCount: dueHooks.length,
    hookNames: dueHooks.map((hook) => hook.name),
    force: options.force === true,
    ...(filter ? { hookFilter: filter } : {}),
  });

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
    ...(deps.callAi ? { callAi: deps.callAi } : {}),
    ...(deps.computeEmbedding
      ? { computeEmbedding: deps.computeEmbedding }
      : {}),
  };

  const withFormulaResolver = (
    context: ReturnType<typeof buildScheduledHookContext>,
  ) => ({
    ...context,
    formulaResolver,
  });

  const failedHooks: Array<{
    hookId: string;
    hookName: string;
    message: string;
  }> = [];

  for (const definition of dueHooks) {
    if (!isScheduleTrigger(definition.trigger)) {
      continue;
    }

    try {
      const scope = getScheduleScope(definition.trigger);
      const aiBatchSize = definition.trigger.aiBatchSize;
      let hookServices: HookServices = services;
      let aiBatcher: ReturnType<typeof createBatchedCallAi> | null = null;
      // Cap fan-out first; batchSize must be <= concurrency or callAi waits
      // forever for a flush that only runs after the chunk completes (deadlock).
      const recordConcurrency =
        typeof aiBatchSize === "number" && aiBatchSize > 0
          ? Math.min(
              Math.max(1, aiBatchSize),
              MAX_SCHEDULE_EACH_RECORD_CONCURRENCY,
            )
          : 1;
      if (typeof aiBatchSize === "number" && aiBatchSize > 0 && deps.callAi) {
        aiBatcher = createBatchedCallAi({
          callAi: deps.callAi,
          batchSize: recordConcurrency,
          batchCallAi: createBatchCallDataHookAi({
            vertexAiConfig,
            getRepository: (tenantId, entityName) =>
              deps.entityRuntime.getRepository(tenantId, entityName),
          }),
        });
        hookServices = {
          ...services,
          callAi: aiBatcher.callAi,
        };
      }

      if (scope === "once") {
        const context = buildScheduledHookContext({
          definition,
          tenantId: options.tenantId,
          user: { uid: options.scheduledHookUserUid },
          at: options.at,
          current: buildSyntheticScheduledRecord(options.tenantId, options.at),
          services: hookServices,
        });
        await runDataHook(definition, withFormulaResolver(context));
        if (aiBatcher) {
          await aiBatcher.flush();
        }
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
        services: hookServices,
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

      const runForRecord = async (record: (typeof capped)[number]) => {
        const recordData = record as Record<string, unknown>;
        const context = buildScheduledHookContext({
          definition,
          tenantId: options.tenantId,
          user: { uid: options.scheduledHookUserUid },
          at: options.at,
          current: recordData,
          previous: { ...recordData },
          services: hookServices,
        });
        try {
          await runDataHook(definition, withFormulaResolver(context));
        } catch (error: unknown) {
          if (!options.force) {
            throw error;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          options.logger.error(
            "Forced schedule hook record failed; continuing.",
            {
              tenantId: options.tenantId,
              hookId: definition.id,
              hookName: definition.name,
              recordId: recordData.id,
              error: {
                name: error instanceof Error ? error.name : "Error",
                message,
              },
            },
          );
          failedHooks.push({
            hookId: definition.id,
            hookName: definition.name,
            message,
          });
        }
      };

      // Bounded fan-out: batchSize === recordConcurrency so each chunk's
      // callAi auto-flushes (avoids deadlock when concurrency is 1).
      if (aiBatcher) {
        for (let i = 0; i < capped.length; i += recordConcurrency) {
          const chunk = capped.slice(i, i + recordConcurrency);
          await Promise.all(chunk.map((record) => runForRecord(record)));
          await aiBatcher.flush();
        }
      } else {
        for (const record of capped) {
          await runForRecord(record);
        }
      }
    } catch (error: unknown) {
      if (!options.force) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      options.logger.error("Forced schedule hook failed; continuing.", {
        tenantId: options.tenantId,
        hookId: definition.id,
        hookName: definition.name,
        error: {
          name: error instanceof Error ? error.name : "Error",
          message,
        },
      });
      failedHooks.push({
        hookId: definition.id,
        hookName: definition.name,
        message,
      });
    }
  }

  if (options.force && failedHooks.length > 0) {
    const summary = failedHooks
      .slice(0, 5)
      .map((entry) => `${entry.hookName}: ${entry.message}`)
      .join(" | ");
    throw new PermanentHookTaskError(
      `SCHEDULE_HOOK_FAILURES (${failedHooks.length}): ${summary}`,
    );
  }
}
