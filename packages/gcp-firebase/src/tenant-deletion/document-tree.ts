import type {
  CollectionReference,
  DocumentReference,
} from "firebase-admin/firestore";

import {
  TENANT_DELETION_ARCHIVES_COLLECTION,
  TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION,
  TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC,
  TENANTS_COLLECTION,
} from "@repo/shared-types";

import { getFirestoreAdmin, type FirebaseAdminConfig } from "../firebase-admin.js";

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

export async function copyDocumentTree(
  sourceRef: DocumentReference,
  targetRef: DocumentReference,
  onProgress?: DocumentTreeProgressCallback,
): Promise<void> {
  const snapshot = await sourceRef.get();
  if (snapshot.exists) {
    await targetRef.set(snapshot.data() ?? {});
    onProgress?.({ docsCopied: 1 });
  }

  const subcollections = await sourceRef.listCollections();
  for (const subcollection of subcollections) {
    onProgress?.({ collectionsCopied: 1 });
    const targetSubcollection = targetRef.collection(subcollection.id);
    const docsSnapshot = await subcollection.get();
    for (const doc of docsSnapshot.docs) {
      await copyDocumentTree(
        doc.ref,
        targetSubcollection.doc(doc.id),
        onProgress,
      );
    }
  }
}

export async function deleteDocumentTree(
  docRef: DocumentReference,
  onProgress?: DocumentTreeProgressCallback,
): Promise<number> {
  let deleted = 0;
  const subcollections = await docRef.listCollections();

  for (const subcollection of subcollections) {
    onProgress?.({ collectionsCopied: 1 });
    const docsSnapshot = await subcollection.get();
    for (const doc of docsSnapshot.docs) {
      deleted += await deleteDocumentTree(doc.ref, onProgress);
    }
  }

  const snapshot = await docRef.get();
  if (snapshot.exists) {
    await docRef.delete();
    deleted += 1;
    onProgress?.({ docsDeleted: 1 });
  }

  return deleted;
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
  const tenantRef = firestore.collection(TENANTS_COLLECTION).doc(params.tenantId);
  const archiveRef = firestore
    .collection(TENANT_DELETION_ARCHIVES_COLLECTION)
    .doc(params.archiveId);
  const mirrorRootRef = archiveRef
    .collection(TENANT_DELETION_ARCHIVE_MIRROR_SUBCOLLECTION)
    .doc(TENANT_DELETION_ARCHIVE_MIRROR_ROOT_DOC);

  let collectionsCopied = 0;
  let docsCopied = 0;
  let docsDeleted = 0;

  const trackProgress: DocumentTreeProgressCallback = (delta) => {
    if (delta.collectionsCopied) {
      collectionsCopied += delta.collectionsCopied;
    }
    if (delta.docsCopied) {
      docsCopied += delta.docsCopied;
    }
    if (delta.docsDeleted) {
      docsDeleted += delta.docsDeleted;
    }
    params.onProgress?.(delta);
  };

  const subcollections = await tenantRef.listCollections();
  for (const subcollection of subcollections) {
    trackProgress({ collectionsCopied: 1 });
    const docsSnapshot = await subcollection.get();
    const targetCollection = mirrorRootRef.collection(subcollection.id);
    for (const doc of docsSnapshot.docs) {
      await copyDocumentTree(
        doc.ref,
        targetCollection.doc(doc.id),
        trackProgress,
      );
    }
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
  const tenantRef = firestore.collection(TENANTS_COLLECTION).doc(params.tenantId);

  let collectionsCopied = 0;
  let docsCopied = 0;
  let docsDeleted = 0;

  const trackProgress: DocumentTreeProgressCallback = (delta) => {
    if (delta.collectionsCopied) {
      collectionsCopied += delta.collectionsCopied;
    }
    if (delta.docsCopied) {
      docsCopied += delta.docsCopied;
    }
    if (delta.docsDeleted) {
      docsDeleted += delta.docsDeleted;
    }
    params.onProgress?.(delta);
  };

  const subcollections = await tenantRef.listCollections();
  for (const subcollection of subcollections) {
    trackProgress({ collectionsCopied: 1 });
    const docsSnapshot = await subcollection.get();
    for (const doc of docsSnapshot.docs) {
      await deleteDocumentTree(doc.ref, trackProgress);
    }
  }

  const tenantSnapshot = await tenantRef.get();
  if (tenantSnapshot.exists) {
    await tenantRef.delete();
    docsDeleted += 1;
    trackProgress({ docsDeleted: 1 });
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
  const subcollections = await mirrorRootRef.listCollections();
  for (const subcollection of subcollections) {
    const docsSnapshot = await subcollection.get();
    for (const doc of docsSnapshot.docs) {
      deleted += await deleteDocumentTree(doc.ref);
    }
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
  const snapshot = await collection.get();
  let deleted = 0;
  for (const doc of snapshot.docs) {
    deleted += await deleteDocumentTree(doc.ref);
  }
  return deleted;
}
