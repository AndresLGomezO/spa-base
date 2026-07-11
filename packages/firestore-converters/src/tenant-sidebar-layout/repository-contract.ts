import type {
  PutTenantSidebarLayoutInput,
  TenantSidebarLayoutRecord,
} from "@repo/entities";

export interface TenantSidebarLayoutRepository {
  get(tenantId: string): Promise<TenantSidebarLayoutRecord | null>;
  put(
    tenantId: string,
    input: PutTenantSidebarLayoutInput,
  ): Promise<TenantSidebarLayoutRecord>;
  delete(tenantId: string): Promise<boolean>;
}
