import { createPersistingHookLogger } from "@repo/debug-logs";
import {
  createFirestoreAdminDataHookExecutionRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminHookLogMessageRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { createHookEntityAccessControl } from "@repo/rbac";
import { createHookEntityServices, type HookLogger } from "@repo/hooks";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { dispatchChainedEntityHooks } from "../../hooks/dispatch-chained-entity-hooks.js";
import { createHookRuntimeContext } from "../../hooks/hook-runtime-context.js";
import { createRecordDataHookExecution } from "../../hooks/record-data-hook-execution.js";

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
  readonly entityRuntime: EntityRuntimeContext;
}): Promise<SeedHookRunner> {
  const hookRepository = createFirestoreAdminDataHookRepository(
    options.firebaseAdminConfig,
  );
  const hookRuntime = createHookRuntimeContext(hookRepository);
  await hookRuntime.ensureTenantHooksLoaded(options.tenantId);

  const hookExecutionRepository =
    createFirestoreAdminDataHookExecutionRepository(
      options.firebaseAdminConfig,
    );
  const recordDataHookExecution = createRecordDataHookExecution(
    hookExecutionRepository,
    options.tenantId,
  );

  const hookLogMessageRepository = createFirestoreAdminHookLogMessageRepository(
    options.firebaseAdminConfig,
  );
  const logger = createPersistingHookLogger({
    base: seedHookConsoleLogger,
    repository: hookLogMessageRepository,
    tenantId: options.tenantId,
  });

  const accessControl = createHookEntityAccessControl({
    permissions: [],
    isSuperAdmin: true,
    tenantId: options.tenantId,
  });

  const entityServices = createHookEntityServices({
    entityRuntime: options.entityRuntime,
    accessControl,
    tenantId: options.tenantId,
    ownerUserId: options.ownerUserId,
    dispatchChainedHooks: (params) =>
      dispatchChainedEntityHooks({
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
        recordDataHookExecution,
      }),
  });

  return {
    async runAfterCreateHooks(entityName, record) {
      await dispatchChainedEntityHooks({
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
        recordDataHookExecution,
      });
    },
  };
}
