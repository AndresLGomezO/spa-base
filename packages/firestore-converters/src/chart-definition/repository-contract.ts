import type {
  CreateChartDefinitionInput,
  ChartDefinitionRecord,
  PatchChartDefinitionInput,
} from "@repo/chart-definitions";

export interface ChartDefinitionRepository {
  list(tenantId: string): Promise<readonly ChartDefinitionRecord[]>;
  listActive(tenantId: string): Promise<readonly ChartDefinitionRecord[]>;
  getById(tenantId: string, id: string): Promise<ChartDefinitionRecord | null>;
  create(
    tenantId: string,
    input: CreateChartDefinitionInput,
  ): Promise<ChartDefinitionRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchChartDefinitionInput,
  ): Promise<ChartDefinitionRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
