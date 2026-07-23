import type {
  CreateRequestPerfLogInput,
  RequestPerfLogRecord,
} from "@repo/debug-logs";

import type { ListRecentTimeRangeOptions } from "../list-recent-time-range.js";

export interface RequestPerfLogRepository {
  create(
    tenantId: string,
    input: CreateRequestPerfLogInput,
  ): Promise<RequestPerfLogRecord>;
  listRecent(
    tenantId: string,
    options?: { readonly limit?: number } & ListRecentTimeRangeOptions,
  ): Promise<readonly RequestPerfLogRecord[]>;
}
