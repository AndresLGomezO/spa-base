import { z } from "zod";

export const AGGREGATION_EVENTS_COLLECTION = "__events" as const;

export const AGGREGATION_EVENT_OPERATIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
] as const;
export const AGGREGATION_EVENT_STATUSES = [
  "PENDING",
  "PROCESSED",
  "FAILED",
] as const;

export type AggregationEventOperation =
  (typeof AGGREGATION_EVENT_OPERATIONS)[number];
export type AggregationEventStatus =
  (typeof AGGREGATION_EVENT_STATUSES)[number];

export const aggregationEventSchema = z.object({
  eventId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  model: z.string().trim().min(1),
  operation: z.enum(AGGREGATION_EVENT_OPERATIONS),
  documentId: z.string().trim().min(1),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  changedFields: z.array(z.string().trim().min(1)),
  schemaVersion: z.number().int().nonnegative(),
  timestamp: z.string().trim().min(1),
  checksum: z.string().trim().min(1),
  status: z.enum(AGGREGATION_EVENT_STATUSES),
  retries: z.number().int().nonnegative(),
});

export type AggregationEvent = z.infer<typeof aggregationEventSchema>;

export const aggregationEventMessageSchema = z.object({
  eventId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
});

export type AggregationEventMessage = z.infer<
  typeof aggregationEventMessageSchema
>;
