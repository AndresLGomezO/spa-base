import { METRIC_CONTRIBUTIONS_ROOT } from "@repo/metrics-engine";

import type { MetricContributionRepository } from "@repo/firestore-converters";
import { metricContributionRecordSchema } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminMetricContributionRepository(
  config: FirebaseAdminConfig,
): MetricContributionRepository {
  function sourcesCollection(tenantId: string, metricDefinitionId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      METRIC_CONTRIBUTIONS_ROOT,
    )
      .doc(metricDefinitionId)
      .collection("sources");
  }

  return {
    async hasContributed(tenantId, metricDefinitionId, documentId) {
      const snapshot = await sourcesCollection(tenantId, metricDefinitionId)
        .doc(documentId)
        .get();
      return snapshot.exists;
    },
    async markContributed(
      tenantId,
      metricDefinitionId,
      documentId,
      lastEventId,
    ) {
      const now = new Date().toISOString();
      const docRef = sourcesCollection(tenantId, metricDefinitionId).doc(
        documentId,
      );
      const existing = await docRef.get();
      const record = metricContributionRecordSchema.parse({
        id: documentId,
        tenantId,
        metricDefinitionId,
        documentId,
        firstContributedAt: existing.exists
          ? (existing.data()?.firstContributedAt ?? now)
          : now,
        lastEventId,
      });
      await docRef.set(record, { merge: true });
    },
    async markContributedBatch(
      tenantId,
      metricDefinitionId,
      documentIds,
      lastEventId,
    ) {
      if (documentIds.length === 0) {
        return;
      }

      const firestore = getFirestoreAdmin(config);
      const now = new Date().toISOString();
      const collectionRef = sourcesCollection(tenantId, metricDefinitionId);
      const batchSize = 400;

      for (let index = 0; index < documentIds.length; index += batchSize) {
        const chunk = documentIds.slice(index, index + batchSize);
        const batch = firestore.batch();

        for (const documentId of chunk) {
          const docRef = collectionRef.doc(documentId);
          batch.set(
            docRef,
            metricContributionRecordSchema.parse({
              id: documentId,
              tenantId,
              metricDefinitionId,
              documentId,
              firstContributedAt: now,
              lastEventId,
            }),
            { merge: true },
          );
        }

        await batch.commit();
      }
    },
    async clearContribution(tenantId, metricDefinitionId, documentId) {
      await sourcesCollection(tenantId, metricDefinitionId)
        .doc(documentId)
        .delete();
    },
    async clearForMetric(tenantId, metricDefinitionId) {
      const collectionRef = sourcesCollection(tenantId, metricDefinitionId);
      const snapshot = await collectionRef.select().get();
      if (snapshot.empty) {
        return;
      }

      const firestore = getFirestoreAdmin(config);
      const batchSize = 400;

      for (let index = 0; index < snapshot.docs.length; index += batchSize) {
        const chunk = snapshot.docs.slice(index, index + batchSize);
        const batch = firestore.batch();
        for (const doc of chunk) {
          batch.delete(doc.ref);
        }
        await batch.commit();
      }
    },
  };
}
