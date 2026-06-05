import type {
  CollectionReference,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore";

import { TENANTS_COLLECTION } from "@repo/shared-types";

import type { SharedFlags } from "./parse-args.js";

function splitPath(path: string): readonly string[] {
  const segments = path.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Path must not be empty.");
  }
  return segments;
}

function collectionRefFromSegments(
  firestore: Firestore,
  segments: readonly string[],
): CollectionReference {
  if (segments.length % 2 === 0) {
    throw new Error(
      `Path "${segments.join("/")}" points to a document, not a collection.`,
    );
  }

  let ref: CollectionReference | DocumentReference = firestore.collection(
    segments[0]!,
  );

  for (let index = 1; index < segments.length; index += 2) {
    ref = (ref as CollectionReference).doc(segments[index]!);
    if (index + 1 < segments.length) {
      ref = (ref as DocumentReference).collection(segments[index + 1]!);
    }
  }

  return ref as CollectionReference;
}

function documentRefFromSegments(
  firestore: Firestore,
  segments: readonly string[],
): DocumentReference {
  if (segments.length % 2 !== 0) {
    throw new Error(
      `Path "${segments.join("/")}" points to a collection, not a document.`,
    );
  }

  let ref: CollectionReference | DocumentReference = firestore.collection(
    segments[0]!,
  );

  for (let index = 1; index < segments.length; index += 2) {
    ref = (ref as CollectionReference).doc(segments[index]!);
    if (index + 1 < segments.length) {
      ref = (ref as DocumentReference).collection(segments[index + 1]!);
    }
  }

  return ref as DocumentReference;
}

function tenantEntityCollectionRef(
  firestore: Firestore,
  tenantId: string,
  collection: string,
): CollectionReference {
  return firestore
    .collection(TENANTS_COLLECTION)
    .doc(tenantId)
    .collection(collection);
}

export function resolveCollectionRef(
  firestore: Firestore,
  flags: SharedFlags,
): CollectionReference {
  if (flags.path) {
    return collectionRefFromSegments(firestore, splitPath(flags.path));
  }

  if (flags.tenant) {
    return tenantEntityCollectionRef(
      firestore,
      flags.tenant,
      flags.collection!,
    );
  }

  return firestore.collection(flags.collection!);
}

export function resolveDocumentRef(
  firestore: Firestore,
  flags: SharedFlags,
): DocumentReference {
  if (flags.path) {
    return documentRefFromSegments(firestore, splitPath(flags.path));
  }

  const collectionRef = resolveCollectionRef(firestore, flags);
  return collectionRef.doc(flags.id!);
}

export function describeTarget(flags: SharedFlags): string {
  if (flags.path) {
    return flags.path;
  }

  const collectionPath = flags.tenant
    ? `${TENANTS_COLLECTION}/${flags.tenant}/${flags.collection}`
    : flags.collection!;

  return flags.id ? `${collectionPath}/${flags.id}` : collectionPath;
}
