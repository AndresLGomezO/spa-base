import {
  authProviderProfileSchema,
  registeredUserSchemaV2,
  type AuthUserProjection,
  type RegisteredUser,
  type UserRole,
} from "@repo/shared-types";

function normalizeOptionalString(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export interface CreateRegisteredUserOptions {
  readonly initialRole?: UserRole;
}

export function createRegisteredUserFromAuthUser(
  authUser: AuthUserProjection,
  nowIso: string,
  options: CreateRegisteredUserOptions = {},
): RegisteredUser {
  return registeredUserSchemaV2.parse({
    uid: authUser.uid,
    email: normalizeOptionalString(authUser.email),
    emailVerified: authUser.emailVerified,
    displayName: normalizeOptionalString(authUser.displayName),
    photoURL: normalizeOptionalString(authUser.photoURL),
    phoneNumber: normalizeOptionalString(authUser.phoneNumber),
    disabled: authUser.disabled,
    providers: authUser.providers.map((provider) =>
      authProviderProfileSchema.parse({
        providerId: provider.providerId,
        uid: normalizeOptionalString(provider.uid),
        email: normalizeOptionalString(provider.email),
        displayName: normalizeOptionalString(provider.displayName),
        photoURL: normalizeOptionalString(provider.photoURL),
        phoneNumber: normalizeOptionalString(provider.phoneNumber),
      }),
    ),
    authCreatedAt: normalizeOptionalString(authUser.authCreatedAt),
    authLastSignInAt: normalizeOptionalString(authUser.authLastSignInAt),
    role: options.initialRole ?? "member",
    lastClaimsSyncAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export function mergeRegisteredUserFromAuthUser(
  current: RegisteredUser,
  authUser: AuthUserProjection,
  nowIso: string,
): RegisteredUser {
  return registeredUserSchemaV2.parse({
    uid: current.uid,
    email: normalizeOptionalString(authUser.email),
    emailVerified: authUser.emailVerified,
    displayName: normalizeOptionalString(authUser.displayName),
    photoURL: normalizeOptionalString(authUser.photoURL),
    phoneNumber: normalizeOptionalString(authUser.phoneNumber),
    disabled: authUser.disabled,
    providers: authUser.providers.map((provider) =>
      authProviderProfileSchema.parse({
        providerId: provider.providerId,
        uid: normalizeOptionalString(provider.uid),
        email: normalizeOptionalString(provider.email),
        displayName: normalizeOptionalString(provider.displayName),
        photoURL: normalizeOptionalString(provider.photoURL),
        phoneNumber: normalizeOptionalString(provider.phoneNumber),
      }),
    ),
    authCreatedAt: normalizeOptionalString(authUser.authCreatedAt),
    authLastSignInAt: normalizeOptionalString(authUser.authLastSignInAt),
    role: current.role,
    lastClaimsSyncAt: current.lastClaimsSyncAt,
    createdAt: current.createdAt,
    updatedAt: nowIso,
  });
}

export function withRegisteredUserRole(
  user: RegisteredUser,
  role: UserRole,
  nowIso: string,
  lastClaimsSyncAt: string | null = null,
): RegisteredUser {
  return registeredUserSchemaV2.parse({
    ...user,
    role,
    lastClaimsSyncAt,
    updatedAt: nowIso,
  });
}
