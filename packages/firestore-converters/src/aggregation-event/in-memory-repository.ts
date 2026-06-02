import {
  aggregationEventSchema,
  type AggregationEvent,
} from "@repo/event-engine";

import type { AggregationEventRepository } from "./repository-contract.js";

export function createInMemoryAggregationEventRepository(): AggregationEventRepository & {
  readonly store: Map<string, AggregationEvent>;
} {
  const store = new Map<string, AggregationEvent>();

  function key(tenantId: string, eventId: string): string {
    return `${tenantId}:${eventId}`;
  }

  return {
    store,
    async create(tenantId, event) {
      const parsed = aggregationEventSchema.parse(event);
      if (parsed.tenantId !== tenantId) {
        throw new Error("Event tenantId mismatch.");
      }
      store.set(key(tenantId, parsed.eventId), parsed);
      return parsed;
    },
    async getById(tenantId, eventId) {
      return store.get(key(tenantId, eventId)) ?? null;
    },
    async updateStatus(tenantId, eventId, status, retries) {
      const current = store.get(key(tenantId, eventId));
      if (!current) {
        throw new Error(`Aggregation event not found: ${eventId}`);
      }

      const next = aggregationEventSchema.parse({
        ...current,
        status,
        retries: retries ?? current.retries,
      });
      store.set(key(tenantId, eventId), next);
      return next;
    },
    async listByModel(tenantId, model) {
      return [...store.values()]
        .filter((event) => event.tenantId === tenantId && event.model === model)
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    },
  };
}
