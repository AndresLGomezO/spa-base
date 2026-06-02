import { z } from "zod";

export const metricContributionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  metricDefinitionId: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  firstContributedAt: z.string().trim().min(1),
  lastEventId: z.string().trim().min(1).optional(),
});

export type MetricContributionRecord = z.infer<
  typeof metricContributionRecordSchema
>;

export interface MetricContributionRepository {
  hasContributed(
    tenantId: string,
    metricDefinitionId: string,
    documentId: string,
  ): Promise<boolean>;
  markContributed(
    tenantId: string,
    metricDefinitionId: string,
    documentId: string,
    lastEventId?: string,
  ): Promise<void>;
  markContributedBatch(
    tenantId: string,
    metricDefinitionId: string,
    documentIds: readonly string[],
    lastEventId?: string,
  ): Promise<void>;
  clearContribution(
    tenantId: string,
    metricDefinitionId: string,
    documentId: string,
  ): Promise<void>;
  clearForMetric(tenantId: string, metricDefinitionId: string): Promise<void>;
}
