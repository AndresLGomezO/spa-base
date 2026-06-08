import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import {
  RATES_GCP_DEMO_OWNER_UID,
  RATES_GCP_DEMO_USER_ROLE,
} from "./constants.js";

export async function seedRatesGcpDemoUserAccess(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<string> {
  initializeFirebaseAdmin(firebaseAdminConfig);

  const uid = RATES_GCP_DEMO_OWNER_UID;
  const userRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);

  const authUserRecord = await getFirebaseUserRecord(uid, firebaseAdminConfig);
  await userRepository.upsertFromAuthUser(
    mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
  );

  const existing = await userRepository.getByUid(uid);
  const tenants = {
    ...(existing?.tenants ?? {}),
    [tenantId]: [RATES_GCP_DEMO_USER_ROLE],
  };

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(
      `Failed to assign ${RATES_GCP_DEMO_USER_ROLE} to ${uid} on ${tenantId}.`,
    );
  }

  await setFirebaseUserCustomClaims(uid, { tenantId }, firebaseAdminConfig);

  return uid;
}
