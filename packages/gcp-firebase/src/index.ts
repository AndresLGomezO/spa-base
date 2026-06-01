export { FirebaseRuntimeEnvSchema, type FirebaseRuntimeEnv } from "./env.js";
export {
  FieldValue,
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
export { createFirestoreEntityQueryExecutor } from "./firestore-entity-query-executor.js";
export type { FirestoreIndexHint } from "./firestore-entity-query-executor.js";
export {
  buildIndexFromHint,
  ensureEntityFirestoreIndexes,
  ensureFirestoreIndexes,
  scheduleEnsureEntityFirestoreIndexes,
  scheduleEnsureFirestoreIndexesFromHint,
} from "./firestore-index-provisioner.js";
export type { FirestoreCompositeIndex } from "@repo/firestore-indexes";
export {
  createFirestoreIndexStatusStore,
  INDEX_STATUS_COLLECTION,
  type FirestoreIndexStatusStore,
  type IndexProvisioningStatus,
  type IndexStatusRecord,
} from "./firestore-index-status.js";
export {
  INDEX_PROVISIONING_TOPIC,
  publishIndexProvisioningMessage,
  type IndexProvisioningMessage,
} from "./firestore-index-pubsub.js";
export { createFirestoreAdminJoinCollectionRepository } from "./firestore-admin-join-collection-repository.js";
export { createFirestoreAdminPlatformRoleRepository } from "./firestore-admin-platform-role-repository.js";
export { createFirestoreAdminTenantRepository } from "./firestore-admin-tenant-repository.js";
export { createFirestoreAdminEntityDefinitionRepository } from "./firestore-admin-entity-definition-repository.js";
export { createFirestoreAdminHookRepository } from "./firestore-admin-hook-repository.js";
export { createFirestoreAdminTenantRoleRepository } from "./firestore-admin-tenant-role-repository.js";
export {
  createFirestoreAdminRegisteredUserRepository,
  mapFirebaseUserRecordToAuthUserProjection,
} from "./firestore-admin-user-repository.js";
export {
  createFirestoreAdminTenantUserInviteRepository,
  TENANT_USER_INVITES_SUBCOLLECTION,
} from "./firestore-admin-tenant-user-invite-repository.js";
export { uploadTenantLogo, validateStorageObjectId } from "./tenant-storage.js";
