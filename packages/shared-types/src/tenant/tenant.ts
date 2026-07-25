import { z } from "zod";

import { tenantAppearanceSchema } from "./tenant-appearance.js";
import { aiSpendLimitsSchema } from "./ai-spend-limits.js";

export const TENANTS_COLLECTION = "tenants";
export const TENANT_SCHEMA_VERSION = 3 as const;

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

export const tenantSchemaV2 = tenantSchemaV1
  .extend({
    appearance: tenantAppearanceSchema.optional(),
  })
  .strict();

export const tenantSchemaV3 = tenantSchemaV2
  .extend({
    aiLimits: aiSpendLimitsSchema.optional(),
  })
  .strict();

export const persistedTenantSchemaV1 = tenantSchemaV1
  .extend({
    _schemaVersion: z.literal(1),
  })
  .strict();

export const persistedTenantSchemaV2 = tenantSchemaV2
  .extend({
    _schemaVersion: z.literal(2),
  })
  .strict();

export const persistedTenantSchemaV3 = tenantSchemaV3
  .extend({
    _schemaVersion: z.literal(TENANT_SCHEMA_VERSION),
  })
  .strict();

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type Tenant = z.infer<typeof tenantSchemaV3>;
export type PersistedTenant = z.infer<typeof persistedTenantSchemaV3>;

export interface TenantOption {
  readonly id: string;
  readonly name: string;
}
