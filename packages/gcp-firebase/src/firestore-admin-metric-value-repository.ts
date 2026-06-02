import {
  METRICS_VALUES_ROOT,
  metricValueRecordSchema,
  mergeAvgFieldsIntoValues,
  computeAvgFieldsFromValues,
} from "@repo/metrics-engine";

import type { MetricValueRepository } from "@repo/firestore-converters";

import {
  FieldValue,
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminMetricValueRepository(
  config: FirebaseAdminConfig,
): MetricValueRepository {
  function collection(tenantId: string, metricName: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      METRICS_VALUES_ROOT,
    )
      .doc(metricName)
      .collection("rows");
  }

  return {
    async applyIncrements(tenantId, metricName, docId, payload) {
      const docRef = collection(tenantId, metricName).doc(docId);
      const now = new Date().toISOString();
      const incrementPayload: Record<string, unknown> = {
        id: docId,
        tenantId,
        metricName,
        group: payload.group,
        dimensions: payload.dimensions,
        updatedAt: now,
      };

      for (const [key, delta] of Object.entries(payload.increments)) {
        incrementPayload[`values.${key}`] = FieldValue.increment(delta);
      }

      await docRef.set(incrementPayload, { merge: true });
      const snapshot = await docRef.get();
      const data = snapshot.data();
      if (!data) {
        return metricValueRecordSchema.parse({
          id: docId,
          tenantId,
          metricName,
          group: payload.group,
          dimensions: payload.dimensions,
          values: payload.increments,
          updatedAt: now,
        });
      }

      const parsed = metricValueRecordSchema.safeParse({
        id: docId,
        ...data,
      });
      if (parsed.success) {
        const valuesWithAvg = mergeAvgFieldsIntoValues(parsed.data.values);
        const avgFields = computeAvgFieldsFromValues(parsed.data.values);
        if (Object.keys(avgFields).length > 0) {
          const avgPayload: Record<string, unknown> = {};
          for (const [avgKey, avgValue] of Object.entries(avgFields)) {
            avgPayload[`values.${avgKey}`] = avgValue;
          }
          await docRef.set(avgPayload, { merge: true });
        }

        return metricValueRecordSchema.parse({
          ...parsed.data,
          values: valuesWithAvg,
        });
      }

      const values =
        data.values && typeof data.values === "object"
          ? Object.fromEntries(
              Object.entries(data.values as Record<string, unknown>).filter(
                (entry): entry is [string, number] =>
                  typeof entry[1] === "number" && Number.isFinite(entry[1]),
              ),
            )
          : payload.increments;

      const valuesWithAvg = mergeAvgFieldsIntoValues(values);
      const avgFields = computeAvgFieldsFromValues(values);
      if (Object.keys(avgFields).length > 0) {
        const avgPayload: Record<string, unknown> = {};
        for (const [avgKey, avgValue] of Object.entries(avgFields)) {
          avgPayload[`values.${avgKey}`] = avgValue;
        }
        await docRef.set(avgPayload, { merge: true });
      }

      return metricValueRecordSchema.parse({
        id: docId,
        tenantId,
        metricName,
        group:
          data.group && typeof data.group === "object"
            ? data.group
            : payload.group,
        dimensions:
          data.dimensions && typeof data.dimensions === "object"
            ? data.dimensions
            : payload.dimensions,
        values: valuesWithAvg,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
      });
    },
    async getById(tenantId, metricName, docId) {
      const snapshot = await collection(tenantId, metricName).doc(docId).get();
      if (!snapshot.exists) return null;
      return metricValueRecordSchema.parse({
        id: docId,
        ...snapshot.data(),
      });
    },
    async deleteAllRows(tenantId, metricName) {
      const rowsRef = collection(tenantId, metricName);
      const snapshot = await rowsRef.select().get();
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
