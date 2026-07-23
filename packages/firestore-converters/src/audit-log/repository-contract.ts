import type { AuditLogRecord } from "@repo/debug-logs";

import type { ListRecentTimeRangeOptions } from "../list-recent-time-range.js";

export interface AuditLogRepository {
  listRecent(
    tenantId: string,
    options?: { readonly limit?: number } & ListRecentTimeRangeOptions,
  ): Promise<readonly AuditLogRecord[]>;
}
