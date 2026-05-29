import { z } from "zod";

export const TENANTS_COLLECTION = "tenants";
export const TENANT_SCHEMA_VERSION = 1 as const;

const isoDatetimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be an ISO datetime string.",
  });

export const tenantStatusSchema = z.enum(["active", "suspended"]);

export const tenantSchemaV1 = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    status: tenantStatusSchema,
    createdBy: z.string().trim().min(1).nullable(),
    createdAt: isoDatetimeStringSchema,
    updatedAt: isoDatetimeStringSchema,
  })
  .strict();

export const persistedTenantSchemaV1 = tenantSchemaV1
  .extend({
    _schemaVersion: z.literal(TENANT_SCHEMA_VERSION),
  })
  .strict();

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type Tenant = z.infer<typeof tenantSchemaV1>;
export type PersistedTenant = z.infer<typeof persistedTenantSchemaV1>;

export interface TenantOption {
  readonly id: string;
  readonly name: string;
}
