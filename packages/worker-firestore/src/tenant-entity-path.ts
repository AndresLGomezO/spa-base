import type { Firestore } from "firebase-admin/firestore";

const TENANTS_COLLECTION = "tenants";

export function tenantEntityCollectionRef(
  firestore: Firestore,
  tenantId: string,
  collection: string,
) {
  return firestore
    .collection(TENANTS_COLLECTION)
    .doc(tenantId)
    .collection(collection);
}
