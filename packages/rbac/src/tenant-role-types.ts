import { z } from "zod";

export const TENANT_ROLES_SUBCOLLECTION = "roles" as const;

export const ROLE_PERMISSIONS = [
  "role.read",
  "role.create",
  "role.update",
] as const;

export const TENANT_USER_PERMISSIONS = [
  "tenantUser.read",
  "tenantUser.create",
  "tenantUser.update",
  "tenantUser.remove",
] as const;

export const fieldAccessSchema = z.enum(["read", "write", "none"]);
export type FieldAccess = z.infer<typeof fieldAccessSchema>;

export const fieldPermissionSchema = z.object({
  field: z.string().trim().min(1),
  access: fieldAccessSchema,
});

export type FieldPermission = z.infer<typeof fieldPermissionSchema>;

export const entityFieldRulesSchema = z.object({
  resource: z.string().trim().min(1),
  fields: z.array(fieldPermissionSchema).min(1),
});

export type EntityFieldRules = z.infer<typeof entityFieldRulesSchema>;

export const tenantRoleRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  grants: z.array(z.string().trim().min(1)).min(1),
  fieldRules: z.array(entityFieldRulesSchema).optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type TenantRoleRecord = z.infer<typeof tenantRoleRecordSchema>;

export const createTenantRoleInputSchema = tenantRoleRecordSchema
  .omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tenantId: z.string().trim().min(1).optional(),
  });

export type CreateTenantRoleInput = z.infer<typeof createTenantRoleInputSchema>;

export const patchTenantRoleInputSchema = z.object({
  description: z.string().trim().min(1).optional(),
  grants: z.array(z.string().trim().min(1)).min(1).optional(),
  fieldRules: z.array(entityFieldRulesSchema).optional(),
});

export type PatchTenantRoleInput = z.infer<typeof patchTenantRoleInputSchema>;

export const SYSTEM_FIELD_KEYS = [
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
] as const;

export type SystemFieldKey = (typeof SYSTEM_FIELD_KEYS)[number];

export function isSystemFieldKey(field: string): field is SystemFieldKey {
  return (SYSTEM_FIELD_KEYS as readonly string[]).includes(field);
}
