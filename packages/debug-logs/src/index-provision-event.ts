import { z } from "zod";

export const INDEX_PROVISION_EVENTS_COLLECTION =
  "__index_provision_events" as const;

export const INDEX_PROVISION_EVENT_TYPES = [
  "ensure_requested",
  "creating",
  "ready",
  "error",
  "operation_blocked",
] as const;
export type IndexProvisionEventType =
  (typeof INDEX_PROVISION_EVENT_TYPES)[number];

export const INDEX_PROVISION_BLOCKED_OPERATIONS = [
  "import",
  "backfill",
  "catalog_replace",
  "list_query",
] as const;
export type IndexProvisionBlockedOperation =
  (typeof INDEX_PROVISION_BLOCKED_OPERATIONS)[number];

export const createIndexProvisionEventInputSchema = z.object({
  timestamp: z.string().trim().min(1),
  event: z.enum(INDEX_PROVISION_EVENT_TYPES),
  collection: z.string().trim().min(1),
  signature: z.string().trim().min(1).optional(),
  status: z.enum(["CREATING", "READY", "ERROR"]).optional(),
  fields: z.array(z.record(z.string(), z.unknown())).optional(),
  errorMessage: z.string().trim().optional(),
  trigger: z.string().trim().optional(),
  operationName: z.string().trim().optional(),
  blockedOperation: z.enum(INDEX_PROVISION_BLOCKED_OPERATIONS).optional(),
  tenantId: z.string().trim().min(1).optional(),
});
export type CreateIndexProvisionEventInput = z.infer<
  typeof createIndexProvisionEventInputSchema
>;

export const indexProvisionEventRecordSchema =
  createIndexProvisionEventInputSchema.extend({
    id: z.string().trim().min(1),
  });
export type IndexProvisionEventRecord = z.infer<
  typeof indexProvisionEventRecordSchema
>;
