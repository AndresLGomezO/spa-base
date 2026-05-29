import type {
  CreateTenantRoleInput,
  PatchTenantRoleInput,
  TenantRoleRecord,
} from "@repo/rbac";

export interface TenantRoleRepository {
  list(tenantId: string): Promise<readonly TenantRoleRecord[]>;
  getById(tenantId: string, id: string): Promise<TenantRoleRecord | null>;
  getByName(tenantId: string, name: string): Promise<TenantRoleRecord | null>;
  create(
    tenantId: string,
    input: CreateTenantRoleInput,
  ): Promise<TenantRoleRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchTenantRoleInput,
  ): Promise<TenantRoleRecord>;
  ensureFromTemplate(
    tenantId: string,
    template: {
      readonly name: string;
      readonly grants: readonly string[];
      readonly description?: string;
    },
  ): Promise<void>;
}
