import {
  type CollectionReference,
  type DocumentReference,
} from "firebase-admin/firestore";

import type { FirebaseAdminConfig } from "./firebase-admin.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

const FIRESTORE_BATCH_LIMIT = 500;

export interface TenantCollectionDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

async function commitBatchDeletes(
  docRefs: readonly DocumentReference[],
): Promise<void> {
  const firestore = docRefs[0]?.firestore;
  if (!firestore || docRefs.length === 0) {
    return;
  }

  for (let index = 0; index < docRefs.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = firestore.batch();
    for (const docRef of docRefs.slice(index, index + FIRESTORE_BATCH_LIMIT)) {
      batch.delete(docRef);
    }
    await batch.commit();
  }
}

async function commitBatchSets(
  documents: readonly TenantCollectionDocument[],
  collection: CollectionReference,
): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  const firestore = collection.firestore;
  for (
    let index = 0;
    index < documents.length;
    index += FIRESTORE_BATCH_LIMIT
  ) {
    const batch = firestore.batch();
    for (const document of documents.slice(
      index,
      index + FIRESTORE_BATCH_LIMIT,
    )) {
      batch.set(collection.doc(document.id), document.data);
    }
    await batch.commit();
  }
}

export async function replaceTenantCollectionDocuments(
  config: FirebaseAdminConfig,
  tenantId: string,
  collectionName: string,
  documents: readonly TenantCollectionDocument[],
): Promise<void> {
  const firestore = getFirestoreAdmin(config);
  const collection = tenantEntityCollectionRef(
    firestore,
    tenantId,
    collectionName,
  );
  const snapshot = await collection.get();
  await commitBatchDeletes(snapshot.docs.map((doc) => doc.ref));
  await commitBatchSets(documents, collection);
}
