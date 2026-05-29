import type { Tenant, TenantStatus } from "@repo/shared-types";

export interface CreateTenantInput {
  readonly id?: string;
  readonly name: string;
  readonly createdBy: string | null;
}

export interface UpdateTenantInput {
  readonly name?: string;
  readonly status?: TenantStatus;
}

export interface TenantRepository {
  list(params?: { readonly status?: TenantStatus }): Promise<readonly Tenant[]>;
  getById(id: string): Promise<Tenant | null>;
  create(input: CreateTenantInput): Promise<Tenant>;
  update(id: string, input: UpdateTenantInput): Promise<Tenant | null>;
  ensureTenant(
    id: string,
    name: string,
    createdBy: string | null,
  ): Promise<void>;
}
