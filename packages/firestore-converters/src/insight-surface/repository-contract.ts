import type {
  CreateInsightSurfaceInput,
  InsightSurfaceDefinition,
  PatchInsightSurfaceInput,
} from "@repo/ai-context";

export interface InsightSurfaceRepository {
  list(tenantId: string): Promise<readonly InsightSurfaceDefinition[]>;
  getById(
    tenantId: string,
    id: string,
  ): Promise<InsightSurfaceDefinition | null>;
  create(
    tenantId: string,
    input: CreateInsightSurfaceInput,
  ): Promise<InsightSurfaceDefinition>;
  update(
    tenantId: string,
    id: string,
    input: PatchInsightSurfaceInput,
  ): Promise<InsightSurfaceDefinition>;
  delete(tenantId: string, id: string): Promise<void>;
}
