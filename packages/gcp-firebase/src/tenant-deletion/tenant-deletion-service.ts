import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import type { RegisteredUserRepository } from "@repo/firestore-converters";
import {
  computeIndexSignature,
  indexesForEntities,
  type FirestoreCompositeIndex,
} from "@repo/firestore-indexes";
import {
  TENANT_USER_INVITES_SUBCOLLECTION,
  type TenantDeletionArchiveRepository,
  type TenantDeletionJobRepository,
} from "@repo/firestore-converters";
import { registeredUserConverter } from "@repo/firestore-converters";
import {
  TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC,
  TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION,
  TENANT_DELETION_ARCHIVES_COLLECTION,
  TENANTS_COLLECTION,
  USERS_COLLECTION,
  registeredUserSchemaV1,
} from "@repo/shared-types";

import type { EntityDefinitionRepository } from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "../firebase-admin.js";
import { getFirestoreAdmin } from "../firebase-admin.js";
import {
  commitBatchDeletes,
  createThrottledProgressReporter,
  FIRESTORE_BATCH_LIMIT,
} from "../firestore-bulk-helpers.js";
import {
  computeDesiredIndexesFromRepository,
  deleteFirestoreIndex,
  listCompositeIndexes,
  pickIndexesToDelete,
} from "../firestore-index-reconciler.js";
import type { FirestoreIndexStatusStore } from "../firestore-index-status.js";
import { tenantEntityCollectionRef } from "../tenant-entity-path.js";
import { deleteTenantStoragePrefix } from "../tenant-storage.js";
import {
  copyTenantToArchiveMirror,
  purgeArchiveMirror,
  purgeLiveTenantData,
  type DocumentTreeProgressCallback,
} from "./document-tree.js";

export interface TenantDeletionProcessorDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly jobRepository: TenantDeletionJobRepository;
  readonly archiveRepository: TenantDeletionArchiveRepository;
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly entityDefinitionRepository: EntityDefinitionRepository;
  readonly indexStatusStore?: FirestoreIndexStatusStore;
  readonly indexProjectId: string;
  readonly indexDatabaseId?: string;
}

export interface TenantDeletionTaskPayload {
  readonly jobId: string;
  readonly tenantId: string;
  readonly archiveId: string;
  readonly deletedBy: string | null;
}

export async function removeTenantFromAllUsers(params: {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantId: string;
}): Promise<number> {
  const firestore = getFirestoreAdmin(params.firebaseAdminConfig);
  let updatedCount = 0;
  let cursor: string | undefined;

  do {
    const page = await params.registeredUserRepository.list({
      limit: 100,
      cursor,
    });
    const updates = page.items
      .filter((user) => user.tenants?.[params.tenantId])
      .map((user) => {
        const nextTenants = { ...user.tenants };
        Reflect.deleteProperty(nextTenants, params.tenantId);
        return { user, nextTenants };
      });

    for (
      let index = 0;
      index < updates.length;
      index += FIRESTORE_BATCH_LIMIT
    ) {
      const chunk = updates.slice(index, index + FIRESTORE_BATCH_LIMIT);
      if (chunk.length === 0) {
        continue;
      }

      const nowIso = new Date().toISOString();
      const batch = firestore.batch();
      for (const { user, nextTenants } of chunk) {
        const nextUser = registeredUserSchemaV1.parse({
          ...user,
          tenants: nextTenants,
          updatedAt: nowIso,
        });
        batch.set(
          firestore.collection(USERS_COLLECTION).doc(user.uid),
          registeredUserConverter.write(nextUser),
          { merge: false },
        );
      }
      await batch.commit();
      updatedCount += chunk.length;
    }

    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return updatedCount;
}

export async function deleteAllTenantUserInvites(
  config: FirebaseAdminConfig,
  tenantId: string,
): Promise<number> {
  const collection = tenantEntityCollectionRef(
    getFirestoreAdmin(config),
    tenantId,
    TENANT_USER_INVITES_SUBCOLLECTION,
  );
  const snapshot = await collection.get();
  if (snapshot.empty) {
    return 0;
  }

  await commitBatchDeletes(snapshot.docs.map((doc) => doc.ref));
  return snapshot.size;
}

async function reconcileIndexesAfterTenantRemoval(
  deps: TenantDeletionProcessorDeps,
  removedDefinitions: readonly EntityDefinitionRecord[],
): Promise<void> {
  if (removedDefinitions.length === 0) {
    return;
  }

  const removedEntities = removedDefinitions.map(defineEntityFromRecord);
  const removedIndexes = indexesForEntities(removedEntities);
  const globalDesired = await computeDesiredIndexesFromRepository(
    deps.firebaseAdminConfig,
    deps.entityDefinitionRepository,
  );
  const globalSignatures = new Set(
    globalDesired.map((index) => computeIndexSignature(index)),
  );
  const toDelete = pickIndexesToDelete(removedIndexes, globalSignatures);
  if (toDelete.length === 0) {
    return;
  }

  const byCollectionGroup = new Map<string, FirestoreCompositeIndex[]>();
  for (const index of toDelete) {
    const existing = byCollectionGroup.get(index.collectionGroup) ?? [];
    byCollectionGroup.set(index.collectionGroup, [...existing, index]);
  }

  for (const [collectionGroup, indexes] of byCollectionGroup) {
    const listed = await listCompositeIndexes(
      deps.indexProjectId,
      collectionGroup,
      deps.indexDatabaseId,
    );
    const listedBySignature = new Map(
      listed.map((entry) => [entry.signature, entry.resourceName]),
    );

    for (const index of indexes) {
      const signature = computeIndexSignature(index);
      const resourceName = listedBySignature.get(signature);
      if (resourceName) {
        await deleteFirestoreIndex(resourceName);
      }
      await deps.indexStatusStore?.deleteBySignature(signature);
    }

    if (deps.indexStatusStore) {
      const desiredForCollection = new Set(
        globalDesired
          .filter((index) => index.collectionGroup === collectionGroup)
          .map((index) => computeIndexSignature(index)),
      );
      const records =
        await deps.indexStatusStore.listByCollection(collectionGroup);
      await Promise.all(
        records
          .filter((record) => !desiredForCollection.has(record.signature))
          .map((record) =>
            deps.indexStatusStore?.deleteBySignature(record.signature),
          ),
      );
    }
  }
}

export async function processTenantDeletion(
  deps: TenantDeletionProcessorDeps,
  payload: TenantDeletionTaskPayload,
): Promise<void> {
  const job = await deps.jobRepository.getById(payload.jobId);
  if (!job) {
    throw new Error(`Tenant deletion job not found: ${payload.jobId}`);
  }

  const archive = await deps.archiveRepository.getById(payload.archiveId);
  if (!archive) {
    throw new Error(`Tenant deletion archive not found: ${payload.archiveId}`);
  }

  const entityDefinitions = await deps.entityDefinitionRepository.list(
    payload.tenantId,
  );

  let progressState = { ...job.progress };
  const throttledProgress = createThrottledProgressReporter(
    async (delta) => {
      progressState = {
        collectionsCopied:
          progressState.collectionsCopied + (delta.collectionsCopied ?? 0),
        docsCopied: progressState.docsCopied + (delta.docsCopied ?? 0),
        docsDeleted: progressState.docsDeleted + (delta.docsDeleted ?? 0),
      };
      await deps.jobRepository.update(payload.jobId, {
        progress: progressState,
      });
    },
    { flushEveryDocs: 500, flushEveryMs: 3000 },
  );

  const reportProgress: DocumentTreeProgressCallback = (delta) => {
    throttledProgress.report(delta);
  };

  try {
    await deps.jobRepository.update(payload.jobId, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const archiveProgress = await copyTenantToArchiveMirror({
      config: deps.firebaseAdminConfig,
      tenantId: payload.tenantId,
      archiveId: payload.archiveId,
      onProgress: reportProgress,
    });
    await throttledProgress.close();

    await removeTenantFromAllUsers({
      firebaseAdminConfig: deps.firebaseAdminConfig,
      registeredUserRepository: deps.registeredUserRepository,
      tenantId: payload.tenantId,
    });
    await deleteAllTenantUserInvites(
      deps.firebaseAdminConfig,
      payload.tenantId,
    );

    const purgeProgress = await purgeLiveTenantData({
      config: deps.firebaseAdminConfig,
      tenantId: payload.tenantId,
      onProgress: reportProgress,
    });
    await throttledProgress.close();

    const gcsObjectsDeleted = await deleteTenantStoragePrefix(
      deps.firebaseAdminConfig,
      payload.tenantId,
    );

    await reconcileIndexesAfterTenantRemoval(deps, entityDefinitions);

    await deps.archiveRepository.update(payload.archiveId, {
      status: "archived",
      stats: {
        collectionsCopied: archiveProgress.collectionsCopied,
        docsCopied: archiveProgress.docsCopied,
        docsDeleted: purgeProgress.docsDeleted,
        gcsObjectsDeleted,
      },
    });

    await deps.jobRepository.update(payload.jobId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      progress: {
        collectionsCopied: archiveProgress.collectionsCopied,
        docsCopied: archiveProgress.docsCopied,
        docsDeleted: purgeProgress.docsDeleted,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tenant deletion failed.";
    await deps.archiveRepository.update(payload.archiveId, {
      status: "archiving_failed",
    });
    await deps.jobRepository.update(payload.jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });
    throw error;
  }
}

export async function purgeExpiredTenantArchives(
  deps: Pick<
    TenantDeletionProcessorDeps,
    "firebaseAdminConfig" | "archiveRepository"
  >,
  now: Date = new Date(),
): Promise<{ readonly purged: number; readonly failed: number }> {
  const ready = await deps.archiveRepository.listReadyForPurge(
    now.toISOString(),
  );

  let purged = 0;
  let failed = 0;

  for (const archive of ready) {
    try {
      await purgeArchiveMirror({
        config: deps.firebaseAdminConfig,
        archiveId: archive.id,
      });
      await deps.archiveRepository.update(archive.id, {
        status: "purged",
      });
      purged += 1;
    } catch {
      await deps.archiveRepository.update(archive.id, {
        status: "purge_failed",
      });
      failed += 1;
    }
  }

  return { purged, failed };
}

export function getTenantDeletionMirrorRef(
  config: FirebaseAdminConfig,
  archiveId: string,
) {
  return getFirestoreAdmin(config)
    .collection(TENANT_DELETION_ARCHIVES_COLLECTION)
    .doc(archiveId)
    .collection(TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION)
    .doc(TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC);
}

export function getTenantRef(config: FirebaseAdminConfig, tenantId: string) {
  return getFirestoreAdmin(config).collection(TENANTS_COLLECTION).doc(tenantId);
}
