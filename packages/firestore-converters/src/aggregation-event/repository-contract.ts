import type { AggregationEvent } from "@repo/event-engine";

export interface AggregationEventRepository {
  create(tenantId: string, event: AggregationEvent): Promise<AggregationEvent>;
  getById(tenantId: string, eventId: string): Promise<AggregationEvent | null>;
  updateStatus(
    tenantId: string,
    eventId: string,
    status: AggregationEvent["status"],
    retries?: number,
  ): Promise<AggregationEvent>;
  listByModel(
    tenantId: string,
    model: string,
  ): Promise<readonly AggregationEvent[]>;
}
