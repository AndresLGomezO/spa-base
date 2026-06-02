import { nanoid } from "nanoid";

import { computeEventChecksum } from "./checksum.js";
import { computeChangedFields } from "./changed-fields.js";
import {
  aggregationEventSchema,
  type AggregationEvent,
  type AggregationEventOperation,
} from "./types.js";

export function buildAggregationEvent(input: {
  readonly tenantId: string;
  readonly model: string;
  readonly operation: AggregationEventOperation;
  readonly documentId: string;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly businessFieldNames: readonly string[];
  readonly schemaVersion: number;
  readonly timestamp?: string;
}): AggregationEvent {
  const before = input.before;
  const after = input.after;
  const changedFields = computeChangedFields({
    before,
    after,
    businessFieldNames: input.businessFieldNames,
  });
  const checksum = computeEventChecksum({
    tenantId: input.tenantId,
    model: input.model,
    documentId: input.documentId,
    operation: input.operation,
    before,
    after,
  });

  return aggregationEventSchema.parse({
    eventId: nanoid(),
    tenantId: input.tenantId,
    model: input.model,
    operation: input.operation,
    documentId: input.documentId,
    before,
    after,
    changedFields,
    schemaVersion: input.schemaVersion,
    timestamp: input.timestamp ?? new Date().toISOString(),
    checksum,
    status: "PENDING",
    retries: 0,
  });
}
