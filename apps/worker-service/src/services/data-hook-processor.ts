import {
  runQueuedDataHookJob,
  dataHookJobPayloadSchema,
  type DataHookJobPayload,
  type HookLogger,
} from "@repo/hooks";
import { buildRoleCatalog } from "@repo/rbac";
import {
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantRoleRepository,
} from "@repo/gcp-firebase";
import { createFirestoreAdminEntityDefinitionRepository } from "@repo/gcp-firebase";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { platformApp } from "@app/platform/app.config.js";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { PermanentTaskError } from "./ai-chat-processor.js";
import { createLoadRequestPermissionsDeps } from "../hooks/worker-permission-deps.js";
import { HookRuntimeContext } from "../hooks/worker-hook-runtime-context.js";
import { WorkerHookEntityRuntime } from "../hooks/worker-hook-entity-runtime.js";
import {
  buildHookEntityServices,
  resolveHookUserContext,
  type WorkerCrudHookDeps,
} from "../hooks/worker-hook-entity-services.js";

export { dataHookJobPayloadSchema };

export class PermanentHookTaskError extends PermanentTaskError {
  constructor(code: string) {
    super(code);
    this.name = "PermanentHookTaskError";
  }
}

export type DataHookProcessorDeps = WorkerCrudHookDeps;

export function createDataHookProcessorDeps(
  firebaseAdminConfig: FirebaseAdminConfig,
): DataHookProcessorDeps {
  bootstrapPlatformApp(platformApp);

  const hookRepository =
    createFirestoreAdminDataHookRepository(firebaseAdminConfig);
  const registeredUserRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const tenantRoleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);
  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);

  const permissionDeps = createLoadRequestPermissionsDeps(
    registeredUserRepository,
    async (tenantId) => {
      const roles = await tenantRoleRepository.list(tenantId);
      return buildRoleCatalog(roles);
    },
  );

  return {
    hookRuntime: new HookRuntimeContext(hookRepository),
    entityRuntime: new WorkerHookEntityRuntime(
      firebaseAdminConfig,
      entityDefinitionRepository,
    ),
    permissionDeps,
  };
}

export async function processDataHookJob(
  deps: DataHookProcessorDeps,
  payload: DataHookJobPayload,
  logger: HookLogger,
): Promise<void> {
  await deps.entityRuntime.ensureTenantEntitiesLoaded(payload.tenantId);
  await deps.hookRuntime.ensureTenantHooksLoaded(payload.tenantId);

  const definition = await deps.hookRuntime.repository.getById(
    payload.tenantId,
    payload.hookId,
  );
  if (!definition) {
    throw new PermanentHookTaskError("HOOK_NOT_FOUND");
  }
  if (!definition.enabled) {
    return;
  }

  const user = await resolveHookUserContext(
    payload.tenantId,
    payload.user.uid,
    deps.permissionDeps,
  );

  const entities = buildHookEntityServices({
    user,
    deps,
    logger,
  });

  await runQueuedDataHookJob(definition, payload, {
    entities,
    logger,
  });
}
