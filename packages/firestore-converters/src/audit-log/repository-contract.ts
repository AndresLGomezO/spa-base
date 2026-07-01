import type { AuditLogRecord } from "@repo/debug-logs";

export interface AuditLogRepository {
  listRecent(
    tenantId: string,
    options?: { readonly limit?: number },
  ): Promise<readonly AuditLogRecord[]>;
}
