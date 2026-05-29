import type { Firestore } from "firebase-admin/firestore";

import { TENANTS_COLLECTION } from "@repo/shared-types";

export { TENANTS_COLLECTION };

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
