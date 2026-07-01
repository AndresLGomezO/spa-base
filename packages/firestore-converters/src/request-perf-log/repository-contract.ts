import type {
  CreateRequestPerfLogInput,
  RequestPerfLogRecord,
} from "@repo/debug-logs";

export interface RequestPerfLogRepository {
  create(
    tenantId: string,
    input: CreateRequestPerfLogInput,
  ): Promise<RequestPerfLogRecord>;
  listRecent(
    tenantId: string,
    options?: { readonly limit?: number },
  ): Promise<readonly RequestPerfLogRecord[]>;
}
