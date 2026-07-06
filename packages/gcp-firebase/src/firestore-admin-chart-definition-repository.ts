import {
  CHART_DEFINITIONS_COLLECTION,
  chartDefinitionRecordSchema,
  createChartDefinitionInputSchema,
  patchChartDefinitionInputSchema,
  type CreateChartDefinitionInput,
  type ChartDefinitionRecord,
  type PatchChartDefinitionInput,
} from "@repo/chart-definitions";
import { nanoid } from "nanoid";

import type { ChartDefinitionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function slugChartId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function toRecord(data: unknown): ChartDefinitionRecord {
  return chartDefinitionRecordSchema.parse(data);
}

export function createFirestoreAdminChartDefinitionRepository(
  config: FirebaseAdminConfig,
): ChartDefinitionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      CHART_DEFINITIONS_COLLECTION,
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
    async create(tenantId, input: CreateChartDefinitionInput) {
      const parsed = createChartDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `chart_${nanoid(12)}`;
      const record = chartDefinitionRecordSchema.parse({
        id,
        tenantId,
        chartId: slugChartId(parsed.name) || id,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        chartType: parsed.chartType,
        ...(parsed.displayMode !== undefined
          ? { displayMode: parsed.displayMode }
          : {}),
        dataSource: parsed.dataSource,
        ...(parsed.series !== undefined ? { series: parsed.series } : {}),
        ...(parsed.xAxis !== undefined ? { xAxis: parsed.xAxis } : {}),
        ...(parsed.yAxis !== undefined ? { yAxis: parsed.yAxis } : {}),
        ...(parsed.legend !== undefined ? { legend: parsed.legend } : {}),
        ...(parsed.grid !== undefined ? { grid: parsed.grid } : {}),
        ...(parsed.animation !== undefined
          ? { animation: parsed.animation }
          : {}),
        status: parsed.status,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchChartDefinitionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Chart definition not found: ${id}`);
      }

      patchChartDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = chartDefinitionRecordSchema.parse({
        ...current,
        ...(input.name
          ? {
              name: input.name,
              chartId: slugChartId(input.name) || current.chartId,
            }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.chartType ? { chartType: input.chartType } : {}),
        ...(input.displayMode !== undefined
          ? { displayMode: input.displayMode }
          : {}),
        ...(input.dataSource ? { dataSource: input.dataSource } : {}),
        ...(input.series !== undefined ? { series: input.series } : {}),
        ...(input.xAxis !== undefined ? { xAxis: input.xAxis } : {}),
        ...(input.yAxis !== undefined ? { yAxis: input.yAxis } : {}),
        ...(input.legend !== undefined ? { legend: input.legend } : {}),
        ...(input.grid !== undefined ? { grid: input.grid } : {}),
        ...(input.animation !== undefined
          ? { animation: input.animation }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        version: current.version + 1,
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
