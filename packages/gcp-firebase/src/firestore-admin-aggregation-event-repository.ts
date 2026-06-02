import {
  AGGREGATION_EVENTS_COLLECTION,
  aggregationEventSchema,
  type AggregationEvent,
} from "@repo/event-engine";

import type { AggregationEventRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toEvent(data: unknown): AggregationEvent {
  return aggregationEventSchema.parse(data);
}

export function createFirestoreAdminAggregationEventRepository(
  config: FirebaseAdminConfig,
): AggregationEventRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AGGREGATION_EVENTS_COLLECTION,
    );
  }

  return {
    async create(tenantId, event) {
      const parsed = aggregationEventSchema.parse(event);
      if (parsed.tenantId !== tenantId) {
        throw new Error("Event tenantId mismatch.");
      }
      await collection(tenantId).doc(parsed.eventId).set(parsed);
      return parsed;
    },
    async getById(tenantId, eventId) {
      const snapshot = await collection(tenantId).doc(eventId).get();
      if (!snapshot.exists) return null;
      return toEvent(snapshot.data());
    },
    async updateStatus(tenantId, eventId, status, retries) {
      const docRef = collection(tenantId).doc(eventId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        throw new Error(`Aggregation event not found: ${eventId}`);
      }

      const patch: Record<string, unknown> = { status };
      if (retries !== undefined) {
        patch.retries = retries;
      }
      await docRef.update(patch);

      const updated = await docRef.get();
      return toEvent(updated.data());
    },
    async listByModel(tenantId, model) {
      const snapshot = await collection(tenantId)
        .where("model", "==", model)
        .orderBy("timestamp")
        .get();
      return snapshot.docs.map((doc) => toEvent(doc.data()));
    },
  };
}
