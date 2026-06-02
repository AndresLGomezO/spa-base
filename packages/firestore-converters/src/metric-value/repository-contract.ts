import type { MetricValueRecord } from "@repo/metrics-engine";

export interface MetricValueRepository {
  applyIncrements(
    tenantId: string,
    metricName: string,
    docId: string,
    payload: {
      readonly userId: string;
      readonly group: Record<string, unknown>;
      readonly dimensions: Record<string, unknown>;
      readonly increments: Record<string, number>;
    },
  ): Promise<MetricValueRecord>;
  getById(
    tenantId: string,
    metricName: string,
    docId: string,
  ): Promise<MetricValueRecord | null>;
  getManyByIds(
    tenantId: string,
    metricName: string,
    docIds: readonly string[],
  ): Promise<readonly (MetricValueRecord | null)[]>;
  deleteAllRows(tenantId: string, metricName: string): Promise<void>;
}
