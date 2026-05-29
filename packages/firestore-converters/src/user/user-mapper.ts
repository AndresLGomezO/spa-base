import {
  authProviderProfileSchema,
  registeredUserSchemaV1,
  type AuthUserProjection,
  type RegisteredUser,
} from "@repo/shared-types";

function normalizeOptionalString(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function createRegisteredUserFromAuthUser(
  authUser: AuthUserProjection,
  nowIso: string,
): RegisteredUser {
  return registeredUserSchemaV1.parse({
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
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export function mergeRegisteredUserFromAuthUser(
  current: RegisteredUser,
  authUser: AuthUserProjection,
  nowIso: string,
): RegisteredUser {
  return registeredUserSchemaV1.parse({
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
    platformRole: current.platformRole ?? null,
    tenants: current.tenants,
    createdAt: current.createdAt,
    updatedAt: nowIso,
  });
}
