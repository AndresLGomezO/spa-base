import { z } from "zod";

export const REQUEST_PERF_LOGS_COLLECTION = "__request_perf_logs" as const;

export const createRequestPerfLogInputSchema = z.object({
  route: z.string().trim().min(1),
  method: z.string().trim().min(1),
  statusCode: z.number().int(),
  rbacMs: z.number().int().nonnegative(),
  queryMs: z.number().int().nonnegative(),
  hooksMs: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
  timestamp: z.string().trim().min(1),
});
export type CreateRequestPerfLogInput = z.infer<
  typeof createRequestPerfLogInputSchema
>;

export const requestPerfLogRecordSchema =
  createRequestPerfLogInputSchema.extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
  });
export type RequestPerfLogRecord = z.infer<typeof requestPerfLogRecordSchema>;
