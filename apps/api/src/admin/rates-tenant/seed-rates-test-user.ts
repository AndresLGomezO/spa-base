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
  RATES_NORMAL_RATES_USER_ROLE,
  RATES_TENANT_ID,
  RATES_TEST_USER_DISPLAY_NAME,
  RATES_TEST_USER_EMAIL,
  RATES_TEST_USER_PASSWORD,
  RATES_TEST_USER_UID,
} from "./constants.js";

interface EnsureRatesTestAuthUserResult {
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
        `[rates seed] Migrating Firestore tenant access from ${replacedAuthUid} to ${uid}.`,
      );
      assignments.push(replacedUser.tenants);
    }
  }

  const userByEmail = await userRepository.findByEmail(RATES_TEST_USER_EMAIL);
  if (userByEmail && userByEmail.uid !== uid && userByEmail.tenants) {
    console.warn(
      `[rates seed] Migrating Firestore tenant access from ${userByEmail.uid} (email match) to ${uid}.`,
    );
    assignments.push(userByEmail.tenants);
  }

  assignments.push({
    [RATES_TENANT_ID]: [RATES_NORMAL_RATES_USER_ROLE],
  });

  return mergeTenantRoleAssignments(...assignments);
}

async function ensureRatesTestAuthUser(): Promise<EnsureRatesTestAuthUserResult> {
  const auth = getAuth();
  let replacedAuthUid: string | null = null;

  try {
    const existingByUid = await auth.getUser(RATES_TEST_USER_UID);
    if (existingByUid.email && existingByUid.email !== RATES_TEST_USER_EMAIL) {
      throw new Error(
        `[rates seed] UID ${RATES_TEST_USER_UID} is assigned to ${existingByUid.email}, expected ${RATES_TEST_USER_EMAIL}.`,
      );
    }

    await auth.updateUser(RATES_TEST_USER_UID, {
      email: RATES_TEST_USER_EMAIL,
      password: RATES_TEST_USER_PASSWORD,
      emailVerified: true,
      displayName: RATES_TEST_USER_DISPLAY_NAME,
    });
    return { uid: RATES_TEST_USER_UID, replacedAuthUid };
  } catch (error: unknown) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }
  }

  try {
    const existingByEmail = await auth.getUserByEmail(RATES_TEST_USER_EMAIL);
    if (existingByEmail.uid !== RATES_TEST_USER_UID) {
      replacedAuthUid = existingByEmail.uid;
      console.warn(
        `[rates seed] Auth user for ${RATES_TEST_USER_EMAIL} has uid ${existingByEmail.uid}, expected ${RATES_TEST_USER_UID}. Recreating with canonical uid.`,
      );
      await auth.deleteUser(existingByEmail.uid);
    }
  } catch (error: unknown) {
    if (!isAuthUserNotFound(error)) {
      throw error;
    }
  }

  await auth.createUser({
    uid: RATES_TEST_USER_UID,
    email: RATES_TEST_USER_EMAIL,
    password: RATES_TEST_USER_PASSWORD,
    emailVerified: true,
    displayName: RATES_TEST_USER_DISPLAY_NAME,
  });

  return { uid: RATES_TEST_USER_UID, replacedAuthUid };
}

export async function seedRatesTestUser(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<string> {
  initializeFirebaseAdmin(firebaseAdminConfig);

  const { uid, replacedAuthUid } = await ensureRatesTestAuthUser();

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
  );

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(
      `Failed to assign ${RATES_NORMAL_RATES_USER_ROLE} to ${uid}.`,
    );
  }

  await setFirebaseUserCustomClaims(
    uid,
    { tenantId: RATES_TENANT_ID },
    firebaseAdminConfig,
  );

  if (replacedAuthUid) {
    console.warn(
      `[rates seed] Sign out and sign in again as ${RATES_TEST_USER_EMAIL} so your session uses uid ${uid}.`,
    );
  }

  return uid;
}
