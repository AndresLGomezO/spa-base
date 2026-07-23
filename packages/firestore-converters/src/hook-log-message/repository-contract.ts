import type {
  CreateHookLogMessageInput,
  HookLogMessageRecord,
} from "@repo/debug-logs";

import type { ListRecentTimeRangeOptions } from "../list-recent-time-range.js";

export interface HookLogMessageRepository {
  create(
    tenantId: string,
    input: CreateHookLogMessageInput,
  ): Promise<HookLogMessageRecord>;
  listRecent(
    tenantId: string,
    options?: { readonly limit?: number } & ListRecentTimeRangeOptions,
  ): Promise<readonly HookLogMessageRecord[]>;
}
