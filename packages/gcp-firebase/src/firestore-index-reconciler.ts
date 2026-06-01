import firestore from "@google-cloud/firestore";

import { defineEntityFromRecord } from "@repo/dynamic-entities";
import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import {
  computeIndexSignature,
  dedupeIndexes,
  indexesForEntity,
  indexesForEntities,
  type FirestoreCompositeIndex,
  type FirestoreIndexField,
} from "@repo/firestore-indexes";
import { TENANTS_COLLECTION } from "@repo/shared-types";

import type { FirebaseAdminConfig } from "./firebase-admin.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import type { EntityDefinitionRepository } from "@repo/firestore-converters";

import {
  ensureFirestoreIndexes,
  type EnsureFirestoreIndexesOptions,
} from "./firestore-index-provisioner.js";
import type { FirestoreIndexStatusStore } from "./firestore-index-status.js";

type FirestoreAdminClient = InstanceType<
  typeof firestore.v1.FirestoreAdminClient
>;

let adminClient: FirestoreAdminClient | undefined;

function getAdminClient(): FirestoreAdminClient {
  adminClient ??= new firestore.v1.FirestoreAdminClient();
  return adminClient;
}

interface AdminIndexField {
  readonly fieldPath?: string | null;
  readonly order?: string | null;
  readonly arrayConfig?: string | null;
}

interface AdminIndex {
  readonly name?: string | null;
  readonly queryScope?: string | null;
  readonly fields?: readonly AdminIndexField[] | null;
}

export interface ListedFirestoreIndex {
  readonly resourceName: string;
  readonly index: FirestoreCompositeIndex;
  readonly signature: string;
}

function mapAdminField(field: AdminIndexField): FirestoreIndexField {
  if (field.arrayConfig === "CONTAINS") {
    return {
      fieldPath: field.fieldPath ?? "",
      arrayConfig: "CONTAINS",
    };
  }
  const order = field.order === "DESCENDING" ? "DESCENDING" : "ASCENDING";
  return {
    fieldPath: field.fieldPath ?? "",
    order,
  };
}

export function adminIndexToComposite(
  collectionGroup: string,
  adminIndex: AdminIndex,
): FirestoreCompositeIndex | null {
  const fields = adminIndex.fields ?? [];
  if (fields.length < 2) {
    return null;
  }
  const queryScope =
    adminIndex.queryScope === "COLLECTION_GROUP"
      ? "COLLECTION_GROUP"
      : "COLLECTION";
  return {
    collectionGroup,
    queryScope,
    fields: fields.map(mapAdminField),
  };
}

export function pickIndexesToDelete(
  removedCandidates: readonly FirestoreCompositeIndex[],
  globalDesiredSignatures: ReadonlySet<string>,
): FirestoreCompositeIndex[] {
  return removedCandidates.filter((index) => {
    const signature = computeIndexSignature(index);
    return !globalDesiredSignatures.has(signature);
  });
}

export async function listCompositeIndexes(
  projectId: string,
  collectionGroup: string,
  databaseId = "(default)",
): Promise<readonly ListedFirestoreIndex[]> {
  const parent = getAdminClient().collectionGroupPath(
    projectId,
    databaseId,
    collectionGroup,
  );
  const [indexes] = await getAdminClient().listIndexes({ parent });
  const listed: ListedFirestoreIndex[] = [];

  for (const raw of indexes ?? []) {
    const adminIndex = raw as AdminIndex;
    const resourceName = adminIndex.name;
    if (!resourceName) {
      continue;
    }
    const composite = adminIndexToComposite(collectionGroup, adminIndex);
    if (!composite) {
      continue;
    }
    listed.push({
      resourceName,
      index: composite,
      signature: computeIndexSignature(composite),
    });
  }

  return listed;
}

export async function deleteFirestoreIndex(
  resourceName: string,
): Promise<void> {
  await getAdminClient().deleteIndex({ name: resourceName });
}

export async function listAllTenantIds(
  config: FirebaseAdminConfig,
): Promise<readonly string[]> {
  const snapshot = await getFirestoreAdmin(config)
    .collection(TENANTS_COLLECTION)
    .select()
    .get();
  return snapshot.docs.map((document) => document.id);
}

export async function computeDesiredIndexesFromRepository(
  config: FirebaseAdminConfig,
  repository: EntityDefinitionRepository,
): Promise<FirestoreCompositeIndex[]> {
  const tenantIds = await listAllTenantIds(config);
  const entities = [];

  for (const tenantId of tenantIds) {
    const records = await repository.list(tenantId);
    for (const record of records) {
      entities.push(defineEntityFromRecord(record));
    }
  }

  return dedupeIndexes(indexesForEntities(entities));
}

export interface ReconcileDefinitionChangeOptions extends EnsureFirestoreIndexesOptions {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly repository: EntityDefinitionRepository;
  readonly statusStore?: FirestoreIndexStatusStore;
}

export async function reconcileIndexesForDefinitionChange(
  previousRecord: EntityDefinitionRecord,
  nextRecord: EntityDefinitionRecord,
  options: ReconcileDefinitionChangeOptions,
): Promise<void> {
  const previousEntity = defineEntityFromRecord(previousRecord);
  const nextEntity = defineEntityFromRecord(nextRecord);
  const oldIndexes = indexesForEntity(previousEntity);
  const newIndexes = indexesForEntity(nextEntity);
  const newSignatures = new Set(
    newIndexes.map((index) => computeIndexSignature(index)),
  );

  await ensureFirestoreIndexes(newIndexes, options);

  const removedCandidates = oldIndexes.filter(
    (index) => !newSignatures.has(computeIndexSignature(index)),
  );
  if (removedCandidates.length === 0) {
    return;
  }

  const globalDesired = await computeDesiredIndexesFromRepository(
    options.firebaseAdminConfig,
    options.repository,
  );
  const globalSignatures = new Set(
    globalDesired.map((index) => computeIndexSignature(index)),
  );
  const toDelete = pickIndexesToDelete(removedCandidates, globalSignatures);

  const collectionGroup = nextEntity.metadata.collection;
  const listed = await listCompositeIndexes(
    options.projectId,
    collectionGroup,
    options.databaseId,
  );
  const listedBySignature = new Map(
    listed.map((entry) => [entry.signature, entry.resourceName]),
  );

  for (const index of toDelete) {
    const signature = computeIndexSignature(index);
    const resourceName = listedBySignature.get(signature);
    if (resourceName) {
      await deleteFirestoreIndex(resourceName);
    }
    await options.statusStore?.deleteBySignature(signature);
  }
}

export function scheduleReconcileIndexesForDefinitionChange(
  previousRecord: EntityDefinitionRecord,
  nextRecord: EntityDefinitionRecord,
  options: ReconcileDefinitionChangeOptions,
): void {
  void reconcileIndexesForDefinitionChange(
    previousRecord,
    nextRecord,
    options,
  ).catch(() => {
    // Errors logged via onError in ensure options when wired by caller
  });
}
