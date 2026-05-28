import { z } from "zod";

export const USER_SCHEMA_VERSION = 1 as const;
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

export const persistedRegisteredUserSchemaV1 = registeredUserSchemaV1
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

export type RegisteredUser = z.infer<typeof registeredUserSchemaV1>;
export type PersistedRegisteredUser = z.infer<typeof persistedRegisteredUserSchemaV1>;
