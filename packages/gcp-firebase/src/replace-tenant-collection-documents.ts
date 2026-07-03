import { type CollectionReference } from "firebase-admin/firestore";

import type { FirebaseAdminConfig } from "./firebase-admin.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import {
  commitBatchDeletes,
  FIRESTORE_BATCH_LIMIT,
} from "./firestore-bulk-helpers.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export interface TenantCollectionDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
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
