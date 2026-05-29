import { z } from "zod";

export const USER_SCHEMA_VERSION = 2 as const;
export const USERS_COLLECTION = "users";

const isoDatetimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be an ISO datetime string.",
  });

const nullableTrimmedString = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .transform((value) => value ?? null);

/** Persisted role id; validate against the product registry (e.g. @repo/rbac-app) at runtime. */
export const userRoleSchema = z.string().trim().min(1);

export type UserRole = z.infer<typeof userRoleSchema>;

export const authProviderProfileSchema = z
  .object({
    providerId: z.string().trim().min(1),
    uid: nullableTrimmedString,
    email: nullableTrimmedString,
    displayName: nullableTrimmedString,
    photoURL: nullableTrimmedString,
    phoneNumber: nullableTrimmedString,
  })
  .strict();

export const registeredUserSchemaV1 = z
  .object({
    uid: z.string().trim().min(1),
    email: nullableTrimmedString,
    emailVerified: z.boolean(),
    displayName: nullableTrimmedString,
    photoURL: nullableTrimmedString,
    phoneNumber: nullableTrimmedString,
    disabled: z.boolean(),
    providers: z.array(authProviderProfileSchema),
    authCreatedAt: isoDatetimeStringSchema.nullable(),
    authLastSignInAt: isoDatetimeStringSchema.nullable(),
    createdAt: isoDatetimeStringSchema,
    updatedAt: isoDatetimeStringSchema,
  })
  .strict();

export const registeredUserSchemaV2 = registeredUserSchemaV1
  .extend({
    role: userRoleSchema.default("member"),
    lastClaimsSyncAt: isoDatetimeStringSchema.nullable(),
  })
  .strict();

export const persistedRegisteredUserSchemaV1 = registeredUserSchemaV1
  .extend({
    _schemaVersion: z.literal(1),
  })
  .strict();

export const persistedRegisteredUserSchemaV2 = registeredUserSchemaV2
  .extend({
    _schemaVersion: z.literal(USER_SCHEMA_VERSION),
  })
  .strict();

export interface AuthUserProjection {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly phoneNumber: string | null;
  readonly disabled: boolean;
  readonly providers: ReadonlyArray<{
    readonly providerId: string;
    readonly uid: string | null;
    readonly email: string | null;
    readonly displayName: string | null;
    readonly photoURL: string | null;
    readonly phoneNumber: string | null;
  }>;
  readonly authCreatedAt: string | null;
  readonly authLastSignInAt: string | null;
}

export type RegisteredUser = z.infer<typeof registeredUserSchemaV2>;
export type PersistedRegisteredUser = z.infer<
  typeof persistedRegisteredUserSchemaV2
>;

/** @deprecated Use registeredUserSchemaV2. Kept for migration tests. */
export type RegisteredUserV1 = z.infer<typeof registeredUserSchemaV1>;
