import type {
  BulkWriter,
  CollectionReference,
  DocumentReference,
} from "firebase-admin/firestore";

import {
  TENANT_DELETION_ARCHIVES_COLLECTION,
  TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION,
  TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC,
  TENANTS_COLLECTION,
} from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "../firebase-admin.js";
import { createBulkWriterWithRetry } from "../firestore-bulk-helpers.js";

export interface DocumentTreeProgress {
  readonly collectionsCopied: number;
  readonly docsCopied: number;
  readonly docsDeleted: number;
}

export interface DocumentTreeProgressDelta {
  readonly collectionsCopied?: number;
  readonly docsCopied?: number;
  readonly docsDeleted?: number;
}

export type DocumentTreeProgressCallback = (
  delta: DocumentTreeProgressDelta,
) => void;

interface CopyDocumentTreeContext {
  readonly bulkWriter: BulkWriter;
  readonly onProgress?: DocumentTreeProgressCallback;
}

async function copyDocumentTreeInternal(
  sourceRef: DocumentReference,
  targetRef: DocumentReference,
  context: CopyDocumentTreeContext,
): Promise<void> {
  const snapshot = await sourceRef.get();
  if (snapshot.exists) {
    context.bulkWriter.set(targetRef, snapshot.data() ?? {});
  }

  const subcollections = await sourceRef.listCollections();
  await Promise.all(
    subcollections.map(async (subcollection) => {
      context.onProgress?.({ collectionsCopied: 1 });
      const targetSubcollection = targetRef.collection(subcollection.id);
      const docsSnapshot = await subcollection.get();
      await Promise.all(
        docsSnapshot.docs.map((doc) =>
          copyDocumentTreeInternal(
            doc.ref,
            targetSubcollection.doc(doc.id),
            context,
          ),
        ),
      );
    }),
  );
}

export async function copyDocumentTree(
  sourceRef: DocumentReference,
  targetRef: DocumentReference,
  onProgress?: DocumentTreeProgressCallback,
): Promise<void> {
  const bulkWriter = createBulkWriterWithRetry(sourceRef.firestore, {
    onWriteSuccess: () => {
      onProgress?.({ docsCopied: 1 });
    },
  });

  try {
    await copyDocumentTreeInternal(sourceRef, targetRef, {
      bulkWriter,
      onProgress,
    });
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }
}

export async function deleteDocumentTree(
  docRef: DocumentReference,
  onProgress?: DocumentTreeProgressCallback,
): Promise<number> {
  const firestore = docRef.firestore;
  let docsDeleted = 0;
  const bulkWriter = createBulkWriterWithRetry(firestore, {
    onWriteSuccess: () => {
      docsDeleted += 1;
      onProgress?.({ docsDeleted: 1 });
    },
  });

  try {
    await firestore.recursiveDelete(docRef, bulkWriter);
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }

  return docsDeleted;
}

export async function listTenantSubcollectionNames(
  config: FirebaseAdminConfig,
  tenantId: string,
): Promise<readonly string[]> {
  const tenantRef = getFirestoreAdmin(config)
    .collection(TENANTS_COLLECTION)
    .doc(tenantId);
  const subcollections = await tenantRef.listCollections();
  return subcollections.map((collection) => collection.id).sort();
}

export async function copyTenantToArchiveMirror(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly archiveId: string;
  readonly onProgress?: DocumentTreeProgressCallback;
}): Promise<DocumentTreeProgress> {
  const firestore = getFirestoreAdmin(params.config);
  const tenantRef = firestore
    .collection(TENANTS_COLLECTION)
    .doc(params.tenantId);
  const archiveRef = firestore
    .collection(TENANT_DELETION_ARCHIVES_COLLECTION)
    .doc(params.archiveId);
  const mirrorRootRef = archiveRef
    .collection(TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION)
    .doc(TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC);

  let collectionsCopied = 0;
  let docsCopied = 0;
  const docsDeleted = 0;

  const trackProgress: DocumentTreeProgressCallback = (delta) => {
    if (delta.collectionsCopied) {
      collectionsCopied += delta.collectionsCopied;
    }
    if (delta.docsCopied) {
      docsCopied += delta.docsCopied;
    }
    params.onProgress?.(delta);
  };

  const bulkWriter = createBulkWriterWithRetry(firestore, {
    onWriteSuccess: () => {
      trackProgress({ docsCopied: 1 });
    },
  });

  try {
    const subcollections = await tenantRef.listCollections();
    await Promise.all(
      subcollections.map(async (subcollection) => {
        trackProgress({ collectionsCopied: 1 });
        const docsSnapshot = await subcollection.get();
        const targetCollection = mirrorRootRef.collection(subcollection.id);
        await Promise.all(
          docsSnapshot.docs.map((doc) =>
            copyDocumentTreeInternal(doc.ref, targetCollection.doc(doc.id), {
              bulkWriter,
              onProgress: trackProgress,
            }),
          ),
        );
      }),
    );
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }

  return {
    collectionsCopied,
    docsCopied,
    docsDeleted,
  };
}

export async function purgeLiveTenantData(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantId: string;
  readonly onProgress?: DocumentTreeProgressCallback;
}): Promise<DocumentTreeProgress> {
  const firestore = getFirestoreAdmin(params.config);
  const tenantRef = firestore
    .collection(TENANTS_COLLECTION)
    .doc(params.tenantId);

  let collectionsCopied = 0;
  const docsCopied = 0;
  let docsDeleted = 0;

  const trackProgress: DocumentTreeProgressCallback = (delta) => {
    if (delta.collectionsCopied) {
      collectionsCopied += delta.collectionsCopied;
    }
    if (delta.docsDeleted) {
      docsDeleted += delta.docsDeleted;
    }
    params.onProgress?.(delta);
  };

  const subcollections = await tenantRef.listCollections();
  if (subcollections.length > 0) {
    trackProgress({ collectionsCopied: subcollections.length });
  }

  const bulkWriter = createBulkWriterWithRetry(firestore, {
    onWriteSuccess: () => {
      trackProgress({ docsDeleted: 1 });
    },
  });

  try {
    await firestore.recursiveDelete(tenantRef, bulkWriter);
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }

  return {
    collectionsCopied,
    docsCopied,
    docsDeleted,
  };
}

export async function purgeArchiveMirror(params: {
  readonly config: FirebaseAdminConfig;
  readonly archiveId: string;
}): Promise<number> {
  const firestore = getFirestoreAdmin(params.config);
  const archiveRef = firestore
    .collection(TENANT_DELETION_ARCHIVES_COLLECTION)
    .doc(params.archiveId);
  const mirrorRootRef = archiveRef
    .collection(TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION)
    .doc(TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC);

  let deleted = 0;
  const bulkWriter = createBulkWriterWithRetry(firestore, {
    onWriteSuccess: () => {
      deleted += 1;
    },
  });

  try {
    await firestore.recursiveDelete(mirrorRootRef, bulkWriter);
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }

  const archiveSnapshot = await archiveRef.get();
  if (archiveSnapshot.exists) {
    await archiveRef.delete();
    deleted += 1;
  }

  return deleted;
}

export async function deleteAllDocumentsInCollection(
  collection: CollectionReference,
): Promise<number> {
  const firestore = collection.firestore;
  let deleted = 0;
  const bulkWriter = createBulkWriterWithRetry(firestore, {
    onWriteSuccess: () => {
      deleted += 1;
    },
  });

  try {
    await firestore.recursiveDelete(collection, bulkWriter);
    await bulkWriter.close();
  } catch (error) {
    await bulkWriter.close();
    throw error;
  }

  return deleted;
}
