import { FieldValue, getFirestoreAdmin } from "./firebase-admin.js";
import type { FirebaseAdminConfig } from "./firebase-admin.js";
import {
  computeIndexSignature,
  type FirestoreCompositeIndex,
} from "@repo/firestore-indexes";

export const INDEX_STATUS_COLLECTION = "__index_status" as const;

export type IndexProvisioningStatus = "CREATING" | "READY" | "ERROR";

export interface IndexStatusRecord {
  readonly signature: string;
  readonly collection: string;
  readonly status: IndexProvisioningStatus;
  readonly fields: FirestoreCompositeIndex["fields"];
  readonly operationName?: string;
  readonly errorMessage?: string;
  readonly updatedAt: string;
}

export function createFirestoreIndexStatusStore(config: FirebaseAdminConfig) {
  const collection = () =>
    getFirestoreAdmin(config).collection(INDEX_STATUS_COLLECTION);

  return {
    async upsertCreating(
      index: FirestoreCompositeIndex,
      operationName?: string,
    ): Promise<IndexStatusRecord> {
      const signature = computeIndexSignature(index);
      const record: IndexStatusRecord = {
        signature,
        collection: index.collectionGroup,
        status: "CREATING",
        fields: index.fields,
        ...(operationName ? { operationName } : {}),
        updatedAt: new Date().toISOString(),
      };
      await collection().doc(signature).set(record, { merge: true });
      return record;
    },

    async markReady(index: FirestoreCompositeIndex): Promise<void> {
      const signature = computeIndexSignature(index);
      await collection().doc(signature).set(
        {
          status: "READY",
          updatedAt: new Date().toISOString(),
          errorMessage: FieldValue.delete(),
        },
        { merge: true },
      );
    },

    async markError(
      index: FirestoreCompositeIndex,
      errorMessage: string,
    ): Promise<void> {
      const signature = computeIndexSignature(index);
      await collection().doc(signature).set(
        {
          status: "ERROR",
          errorMessage,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    },

    async getBySignature(signature: string): Promise<IndexStatusRecord | null> {
      const snapshot = await collection().doc(signature).get();
      if (!snapshot.exists) {
        return null;
      }
      return snapshot.data() as IndexStatusRecord;
    },

    async listByCollection(
      collectionGroup: string,
    ): Promise<readonly IndexStatusRecord[]> {
      const snapshot = await collection()
        .where("collection", "==", collectionGroup)
        .get();
      return snapshot.docs.map((doc) => doc.data() as IndexStatusRecord);
    },

    async isCollectionReady(collectionGroup: string): Promise<boolean> {
      const records = await this.listByCollection(collectionGroup);
      if (records.length === 0) {
        return true;
      }
      return records.every(
        (record) => record.status === "READY" || record.status === "ERROR",
      );
    },

    async hasCreating(collectionGroup: string): Promise<boolean> {
      const records = await this.listByCollection(collectionGroup);
      return records.some((record) => record.status === "CREATING");
    },
  };
}

export type FirestoreIndexStatusStore = ReturnType<
  typeof createFirestoreIndexStatusStore
>;
