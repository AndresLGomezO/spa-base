import {
  chartDefinitionRecordSchema,
  createChartDefinitionInputSchema,
  patchChartDefinitionInputSchema,
  type ChartDefinitionRecord,
} from "@repo/chart-definitions";
import { nanoid } from "nanoid";

import type { ChartDefinitionRepository } from "./repository-contract.js";

function slugChartId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function createInMemoryChartDefinitionRepository(): ChartDefinitionRepository & {
  readonly store: Map<string, ChartDefinitionRecord>;
} {
  const store = new Map<string, ChartDefinitionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()].filter(
        (record) => record.tenantId === tenantId,
      );
    },
    async listActive(tenantId) {
      return (await this.list(tenantId)).filter(
        (record) => record.status === "ACTIVE",
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
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
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
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
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}
