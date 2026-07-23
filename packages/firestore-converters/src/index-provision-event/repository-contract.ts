import type {
  CreateIndexProvisionEventInput,
  IndexProvisionEventRecord,
} from "@repo/debug-logs";

import type { ListRecentTimeRangeOptions } from "../list-recent-time-range.js";

export interface IndexProvisionEventRepository {
  create(
    tenantId: string | undefined,
    input: CreateIndexProvisionEventInput,
  ): Promise<IndexProvisionEventRecord>;
  listRecentForTenant(
    tenantId: string,
    tenantCollections: readonly string[],
    options?: { readonly limit?: number } & ListRecentTimeRangeOptions,
  ): Promise<readonly IndexProvisionEventRecord[]>;
}
