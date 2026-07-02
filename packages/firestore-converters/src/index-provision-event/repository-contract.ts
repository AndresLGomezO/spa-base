import type {
  CreateIndexProvisionEventInput,
  IndexProvisionEventRecord,
} from "@repo/debug-logs";

export interface IndexProvisionEventRepository {
  create(
    tenantId: string | undefined,
    input: CreateIndexProvisionEventInput,
  ): Promise<IndexProvisionEventRecord>;
  listRecentForTenant(
    tenantId: string,
    tenantCollections: readonly string[],
    options?: { readonly limit?: number },
  ): Promise<readonly IndexProvisionEventRecord[]>;
}
