import type {
  CreateMetricDefinitionInput,
  MetricDefinitionRecord,
  PatchMetricDefinitionInput,
} from "@repo/metrics-engine";

export interface MetricDefinitionRepository {
  list(tenantId: string): Promise<readonly MetricDefinitionRecord[]>;
  listActive(tenantId: string): Promise<readonly MetricDefinitionRecord[]>;
  getById(tenantId: string, id: string): Promise<MetricDefinitionRecord | null>;
  create(
    tenantId: string,
    input: CreateMetricDefinitionInput,
  ): Promise<MetricDefinitionRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchMetricDefinitionInput,
  ): Promise<MetricDefinitionRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
