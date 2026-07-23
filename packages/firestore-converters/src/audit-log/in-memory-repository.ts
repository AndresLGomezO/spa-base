import { auditLogRecordSchema, type AuditLogRecord } from "@repo/debug-logs";

import { isIsoWithinTimeRange } from "../list-recent-time-range.js";
import type { AuditLogRepository } from "./repository-contract.js";

export function createInMemoryAuditLogRepository(): AuditLogRepository & {
  readonly store: Map<string, AuditLogRecord>;
  seed(record: AuditLogRecord): void;
} {
  const store = new Map<string, AuditLogRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .filter((record) => isIsoWithinTimeRange(record.timestamp, options))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, limit);
    },
    seed(record: AuditLogRecord) {
      store.set(
        key(record.tenantId, record.id),
        auditLogRecordSchema.parse(record),
      );
    },
  };
}
