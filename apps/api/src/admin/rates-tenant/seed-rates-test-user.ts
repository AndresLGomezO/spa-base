import { getAuth } from "firebase-admin/auth";

import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import {
  RATES_NORMAL_RATES_USER_ROLE,
  RATES_TENANT_ID,
  RATES_TEST_USER_DISPLAY_NAME,
  RATES_TEST_USER_EMAIL,
  RATES_TEST_USER_PASSWORD,
  RATES_TEST_USER_UID,
} from "./constants.js";

export async function seedRatesTestUser(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<string> {
  initializeFirebaseAdmin(firebaseAdminConfig);
  const auth = getAuth();

  let uid: string = RATES_TEST_USER_UID;

  try {
    const existingByUid = await auth.getUser(RATES_TEST_USER_UID);
    uid = existingByUid.uid;
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code !== "auth/user-not-found") {
      throw error;
    }

    try {
      const existingByEmail = await auth.getUserByEmail(RATES_TEST_USER_EMAIL);
      uid = existingByEmail.uid;
      if (uid !== RATES_TEST_USER_UID) {
        console.warn(
          `[rates seed] Auth user for ${RATES_TEST_USER_EMAIL} has uid ${uid}, expected ${RATES_TEST_USER_UID}. Seeding records for actual uid.`,
        );
      }
    } catch (emailError: unknown) {
      const emailCode =
        emailError && typeof emailError === "object" && "code" in emailError
          ? String(emailError.code)
          : "";
      if (emailCode !== "auth/user-not-found") {
        throw emailError;
      }

      await auth.createUser({
        uid: RATES_TEST_USER_UID,
        email: RATES_TEST_USER_EMAIL,
        password: RATES_TEST_USER_PASSWORD,
        emailVerified: true,
        displayName: RATES_TEST_USER_DISPLAY_NAME,
      });
      uid = RATES_TEST_USER_UID;
    }
  }

  const userRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const authUserRecord = await getFirebaseUserRecord(uid, firebaseAdminConfig);
  await userRepository.upsertFromAuthUser(
    mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
  );

  const updated = await userRepository.updateAccess(uid, {
    tenants: { [RATES_TENANT_ID]: [RATES_NORMAL_RATES_USER_ROLE] },
  });
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

  return uid;
}
