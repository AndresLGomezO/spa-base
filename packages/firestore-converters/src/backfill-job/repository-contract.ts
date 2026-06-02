import { z } from "zod";

export const backfillJobStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export type BackfillJobStatus = z.infer<typeof backfillJobStatusSchema>;

export const backfillJobRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  metricDefinitionId: z.string().trim().min(1),
  sourceModel: z.string().trim().min(1),
  status: backfillJobStatusSchema,
  processedEvents: z.number().int().nonnegative(),
  totalEvents: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type BackfillJobRecord = z.infer<typeof backfillJobRecordSchema>;

export interface BackfillJobRepository {
  create(
    tenantId: string,
    input: {
      readonly metricDefinitionId: string;
      readonly sourceModel: string;
    },
  ): Promise<BackfillJobRecord>;
  getById(tenantId: string, id: string): Promise<BackfillJobRecord | null>;
  update(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<
        BackfillJobRecord,
        "status" | "processedEvents" | "totalEvents" | "errorMessage"
      >
    >,
  ): Promise<BackfillJobRecord>;
  hasCompletedBackfillForMetric(
    tenantId: string,
    metricDefinitionId: string,
  ): Promise<boolean>;
}
