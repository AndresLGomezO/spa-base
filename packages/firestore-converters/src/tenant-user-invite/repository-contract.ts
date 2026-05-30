import { z } from "zod";

export const TENANT_USER_INVITES_SUBCOLLECTION = "user_invites" as const;

export const tenantUserInviteRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  email: z.string().trim().email(),
  roles: z.array(z.string().trim().min(1)).min(1),
  createdAt: z.string().trim().min(1),
});

export type TenantUserInviteRecord = z.infer<
  typeof tenantUserInviteRecordSchema
>;

export interface TenantUserInviteRepository {
  list(tenantId: string): Promise<readonly TenantUserInviteRecord[]>;
  getByEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantUserInviteRecord | null>;
  create(
    tenantId: string,
    input: { readonly email: string; readonly roles: readonly string[] },
  ): Promise<TenantUserInviteRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  deleteByEmail(tenantId: string, email: string): Promise<void>;
  listPendingForEmail(
    email: string,
  ): Promise<readonly TenantUserInviteRecord[]>;
}
