export { FirebaseRuntimeEnvSchema, type FirebaseRuntimeEnv } from "./env.js";
export {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
export {
  getFirebaseUserRecord,
  setFirebaseUserCustomClaims,
  verifyFirebaseIdToken,
} from "./auth.js";
export { verifyFirebaseAppCheckToken } from "./app-check.js";
export { createFirestoreAdminEntityRepository } from "./firestore-admin-entity-repository.js";
export { createFirestoreAdminJoinCollectionRepository } from "./firestore-admin-join-collection-repository.js";
export { createFirestoreAdminPlatformRoleRepository } from "./firestore-admin-platform-role-repository.js";
export { createFirestoreAdminTenantRepository } from "./firestore-admin-tenant-repository.js";
export {
  createFirestoreAdminRegisteredUserRepository,
  mapFirebaseUserRecordToAuthUserProjection,
} from "./firestore-admin-user-repository.js";
export { TENANTS_COLLECTION } from "@repo/shared-types";
