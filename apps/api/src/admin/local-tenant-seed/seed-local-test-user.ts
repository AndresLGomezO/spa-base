import { getAuth } from "firebase-admin/auth";

import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type { RegisteredUserRepository } from "@repo/firestore-converters";

import {
  loadLocalTenantConfig,
  type LocalTenantConfig,
} from "./load-tenant-config.js";

interface EnsureLocalTestAuthUserResult {
  readonly uid: string;
  readonly replacedAuthUid: string | null;
}

function isAuthUserNotFound(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return code === "auth/user-not-found";
}

function mergeTenantRoleAssignments(
  ...sources: ReadonlyArray<Readonly<Record<string, readonly string[]>>>
): Record<string, string[]> {
  const merged = new Map<string, Set<string>>();

  for (const source of sources) {
    for (const [tenantId, roles] of Object.entries(source)) {
      const roleSet = merged.get(tenantId) ?? new Set<string>();
      for (const role of roles) {
        roleSet.add(role);
      }
      merged.set(tenantId, roleSet);
    }
  }

  return Object.fromEntries(
    [...merged.entries()].map(([tenantId, roles]) => [tenantId, [...roles]]),
  );
}

async function resolveSeedTenantsForUser(
  userRepository: RegisteredUserRepository,
  uid: string,
  replacedAuthUid: string | null,
  config: LocalTenantConfig,
): Promise<Record<string, string[]>> {
  const assignments: Array<Record<string, readonly string[]>> = [];

  const canonicalUser = await userRepository.getByUid(uid);
  if (canonicalUser?.tenants) {
    assignments.push(canonicalUser.tenants);
  }

  if (replacedAuthUid && replacedAuthUid !== uid) {
    const replacedUser = await userRepository.getByUid(replacedAuthUid);
    if (replacedUser?.tenants) {
      console.warn(
        `[local-tenant seed] Migrating Firestore tenant access from ${replacedAuthUid} to ${uid}.`,
      );
      assignments.push(replacedUser.tenants);
    }
  }

  const userByEmail = await userRepository.findByEmail(config.testUser.email);
  if (userByEmail && userByEmail.uid !== uid && userByEmail.tenants) {
    console.warn(
      `[local-tenant seed] Migrating Firestore tenant access from ${userByEmail.uid} (email match) to ${uid}.`,
    );
    assignments.push(userByEmail.tenants);
  }

  assignments.push({
    [config.id]: [config.normalUserRole],
  });

  return mergeTenantRoleAssignments(...assignments);
}

async function ensureLocalTestAuthUser(
  config: LocalTenantConfig,
): Promise<EnsureLocalTestAuthUserResult> {
  const auth = getAuth();
  let replacedAuthUid: string | null = null;
  const { uid, email, password, displayName } = config.testUser;

  try {
    const existingByUid = await auth.getUser(uid);
    if (existingByUid.email && existingByUid.email !== email) {
      throw new Error(
        `[local-tenant seed] UID ${uid} is assigned to ${existingByUid.email}, expected ${email}.`,
      );
    }

    await auth.updateUser(uid, {
      email,
      password,
      emailVerified: true,
      displayName,
    });
    return { uid, replacedAuthUid };
  } catch (error: unknown) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }
  }

  try {
    const existingByEmail = await auth.getUserByEmail(email);
    if (existingByEmail.uid !== uid) {
      replacedAuthUid = existingByEmail.uid;
      console.warn(
        `[local-tenant seed] Auth user for ${email} has uid ${existingByEmail.uid}, expected ${uid}. Recreating with canonical uid.`,
      );
      await auth.deleteUser(existingByEmail.uid);
    }
  } catch (error: unknown) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }
  }

  await auth.createUser({
    uid,
    email,
    password,
    emailVerified: true,
    displayName,
  });

  return { uid, replacedAuthUid };
}

export async function seedLocalTestUser(
  firebaseAdminConfig: FirebaseAdminConfig,
  config: LocalTenantConfig = loadLocalTenantConfig(),
): Promise<string> {
  initializeFirebaseAdmin(firebaseAdminConfig);

  const { uid, replacedAuthUid } = await ensureLocalTestAuthUser(config);

  const userRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const authUserRecord = await getFirebaseUserRecord(uid, firebaseAdminConfig);
  await userRepository.upsertFromAuthUser(
    mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
  );

  const tenants = await resolveSeedTenantsForUser(
    userRepository,
    uid,
    replacedAuthUid,
    config,
  );

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(`Failed to assign ${config.normalUserRole} to ${uid}.`);
  }

  await setFirebaseUserCustomClaims(
    uid,
    { tenantId: config.id },
    firebaseAdminConfig,
  );

  if (replacedAuthUid) {
    console.warn(
      `[local-tenant seed] Sign out and sign in again as ${config.testUser.email} so your session uses uid ${uid}.`,
    );
  }

  return uid;
}
