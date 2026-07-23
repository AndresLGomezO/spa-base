import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import {
  loadLocalTenantConfig,
  type LocalTenantConfig,
} from "./load-tenant-config.js";

export async function seedLocalGcpDemoUserAccess(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  config: LocalTenantConfig = loadLocalTenantConfig(),
): Promise<string> {
  initializeFirebaseAdmin(firebaseAdminConfig);

  const uid = config.gcpDemoOwnerUid;
  const userRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);

  const authUserRecord = await getFirebaseUserRecord(uid, firebaseAdminConfig);
  await userRepository.upsertFromAuthUser(
    mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
  );

  const existing = await userRepository.getByUid(uid);
  const tenants = {
    ...(existing?.tenants ?? {}),
    [tenantId]: [config.gcpDemoUserRole],
  };

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(
      `Failed to assign ${config.gcpDemoUserRole} to ${uid} on ${tenantId}.`,
    );
  }

  await setFirebaseUserCustomClaims(uid, { tenantId }, firebaseAdminConfig);

  return uid;
}
