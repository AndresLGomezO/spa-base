import { z } from "zod";

export const ROLES_COLLECTION = "roles";
export const PLATFORM_ROLE_SCHEMA_VERSION = 1 as const;

const isoDatetimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be an ISO datetime string.",
  });

export const platformRoleSchemaV1 = z
  .object({
    name: z.string().trim().min(1),
    grants: z.array(z.string().trim().min(1)).min(1),
    tenantId: z.string().trim().min(1).nullable(),
    createdAt: isoDatetimeStringSchema,
    updatedAt: isoDatetimeStringSchema,
  })
  .strict();

export const persistedPlatformRoleSchemaV1 = platformRoleSchemaV1
  .extend({
    _schemaVersion: z.literal(PLATFORM_ROLE_SCHEMA_VERSION),
  })
  .strict();

export type PlatformRole = z.infer<typeof platformRoleSchemaV1>;
export type PersistedPlatformRole = z.infer<
  typeof persistedPlatformRoleSchemaV1
>;
