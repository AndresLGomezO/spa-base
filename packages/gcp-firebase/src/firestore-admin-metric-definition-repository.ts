import {
  createMetricDefinitionInputSchema,
  generateMetricTargetCollection,
  METRICS_DEFINITIONS_COLLECTION,
  metricDefinitionRecordSchema,
  patchMetricDefinitionInputSchema,
  type CreateMetricDefinitionInput,
  type MetricDefinitionRecord,
  type PatchMetricDefinitionInput,
} from "@repo/metrics-engine";
import { nanoid } from "nanoid";

import type { MetricDefinitionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): MetricDefinitionRecord {
  return metricDefinitionRecordSchema.parse(data);
}

export function createFirestoreAdminMetricDefinitionRepository(
  config: FirebaseAdminConfig,
): MetricDefinitionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      METRICS_DEFINITIONS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async listActive(tenantId) {
      const snapshot = await collection(tenantId)
        .where("status", "==", "ACTIVE")
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateMetricDefinitionInput) {
      const parsed = createMetricDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `metric_${nanoid(12)}`;
      const record = metricDefinitionRecordSchema.parse({
        id,
        tenantId,
        metricId: parsed.name.toLowerCase().replace(/\s+/g, "_"),
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        sourceModel: parsed.sourceModel,
        filters: parsed.filters,
        groupBy: parsed.groupBy,
        dimensions: parsed.dimensions,
        aggregations: parsed.aggregations,
        target: {
          collection: generateMetricTargetCollection(id),
          granularity: parsed.target?.granularity ?? "dynamic",
        },
        version: parsed.version,
        schemaVersionDependency: parsed.schemaVersionDependency,
        fieldsDependency: parsed.fieldsDependency,
        status: parsed.status,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchMetricDefinitionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Metric definition not found: ${id}`);
      }

      patchMetricDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = metricDefinitionRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.filters ? { filters: input.filters } : {}),
        ...(input.groupBy ? { groupBy: input.groupBy } : {}),
        ...(input.dimensions ? { dimensions: input.dimensions } : {}),
        ...(input.aggregations ? { aggregations: input.aggregations } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.schemaVersionDependency !== undefined
          ? { schemaVersionDependency: input.schemaVersionDependency }
          : {}),
        ...(input.fieldsDependency
          ? { fieldsDependency: input.fieldsDependency }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
  };
}
