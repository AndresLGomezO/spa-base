import type {
  PutTenantDashboardLayoutInput,
  TenantDashboardLayoutRecord,
} from "@repo/entities";

export interface TenantDashboardLayoutRepository {
  get(tenantId: string): Promise<TenantDashboardLayoutRecord | null>;
  put(
    tenantId: string,
    input: PutTenantDashboardLayoutInput,
  ): Promise<TenantDashboardLayoutRecord>;
}
