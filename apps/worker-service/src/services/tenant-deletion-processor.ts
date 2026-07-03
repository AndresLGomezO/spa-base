import { z } from "zod";

import {
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantDeletionArchiveRepository,
  createFirestoreAdminTenantDeletionJobRepository,
  createFirestoreIndexStatusStore,
  processTenantDeletion,
  purgeExpiredTenantArchives,
  type FirebaseAdminConfig,
  type TenantDeletionProcessorDeps,
  type TenantDeletionTaskPayload,
} from "@repo/gcp-firebase";

export const tenantDeletionTaskPayloadSchema = z
  .object({
    jobId: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    archiveId: z.string().trim().min(1),
    deletedBy: z.string().trim().min(1).nullable(),
  })
  .strict();

export interface TenantDeletionProcessorRouteDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly indexProjectId: string;
  readonly indexDatabaseId?: string;
}

function createTenantDeletionProcessorDeps(
  config: FirebaseAdminConfig,
  options: {
    readonly indexProjectId: string;
    readonly indexDatabaseId?: string;
  },
): TenantDeletionProcessorDeps {
  return {
    firebaseAdminConfig: config,
    jobRepository: createFirestoreAdminTenantDeletionJobRepository(config),
    archiveRepository:
      createFirestoreAdminTenantDeletionArchiveRepository(config),
    registeredUserRepository:
      createFirestoreAdminRegisteredUserRepository(config),
    entityDefinitionRepository:
      createFirestoreAdminEntityDefinitionRepository(config),
    indexStatusStore: createFirestoreIndexStatusStore(config),
    indexProjectId: options.indexProjectId,
    indexDatabaseId: options.indexDatabaseId,
  };
}

export async function processTenantDeletionTask(
  deps: TenantDeletionProcessorRouteDeps,
  payload: TenantDeletionTaskPayload,
): Promise<void> {
  const processorDeps = createTenantDeletionProcessorDeps(
    deps.firebaseAdminConfig,
    {
      indexProjectId: deps.indexProjectId,
      indexDatabaseId: deps.indexDatabaseId,
    },
  );
  await processTenantDeletion(processorDeps, payload);
}

export async function processExpiredTenantArchivePurge(
  deps: TenantDeletionProcessorRouteDeps,
): Promise<{ readonly purged: number; readonly failed: number }> {
  const processorDeps = createTenantDeletionProcessorDeps(
    deps.firebaseAdminConfig,
    {
      indexProjectId: deps.indexProjectId,
      indexDatabaseId: deps.indexDatabaseId,
    },
  );
  return purgeExpiredTenantArchives(processorDeps);
}
