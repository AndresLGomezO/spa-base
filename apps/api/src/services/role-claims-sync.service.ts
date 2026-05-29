import {
  createFirestoreAdminRegisteredUserRepository,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { isUserRole, ROLE, type AppRole } from "@repo/rbac-app";
import type { RegisteredUser, UserRole } from "@repo/shared-types";

export function resolveRoleFromTokenClaims(
  claims: Record<string, unknown>,
): AppRole | null {
  const claimRole = claims.role;
  if (typeof claimRole === "string" && isUserRole(claimRole)) {
    return claimRole;
  }
  return null;
}

export function resolveEffectiveUserRole(
  tokenRole: AppRole | null,
  firestoreRole: UserRole,
  lastClaimsSyncAt: string | null,
  tokenAuthTimeSeconds: number | undefined,
): AppRole {
  if (lastClaimsSyncAt) {
    const syncTimeSeconds = Math.floor(Date.parse(lastClaimsSyncAt) / 1000);
    const tokenIssuedAt = tokenAuthTimeSeconds ?? 0;
    if (!Number.isNaN(syncTimeSeconds) && syncTimeSeconds > tokenIssuedAt) {
      return isUserRole(firestoreRole) ? firestoreRole : ROLE.MEMBER;
    }
  }

  return tokenRole ?? (isUserRole(firestoreRole) ? firestoreRole : ROLE.MEMBER);
}

export function shouldSyncRoleClaims(
  firestoreRole: UserRole,
  tokenClaims: Record<string, unknown>,
): boolean {
  const tokenRole = resolveRoleFromTokenClaims(tokenClaims);
  return tokenRole !== firestoreRole;
}

export async function syncUserRoleClaims(
  user: RegisteredUser,
  config: FirebaseAdminConfig,
): Promise<RegisteredUser> {
  const repository = createFirestoreAdminRegisteredUserRepository(config);
  const syncedAtIso = new Date().toISOString();

  await setFirebaseUserCustomClaims(user.uid, { role: user.role }, config);

  return repository.markClaimsSynced(user.uid, syncedAtIso);
}

export function isBootstrapAdminEmail(
  email: string | null,
  bootstrapAdminEmails: readonly string[],
): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return bootstrapAdminEmails.some(
    (candidate) => candidate.trim().toLowerCase() === normalizedEmail,
  );
}

export function resolveInitialUserRole(
  email: string | null,
  bootstrapAdminEmails: readonly string[],
): AppRole {
  return isBootstrapAdminEmail(email, bootstrapAdminEmails)
    ? ROLE.ADMIN
    : ROLE.MEMBER;
}
