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
export {
  createFirestoreAdminRegisteredUserRepository,
  mapFirebaseUserRecordToAuthUserProjection,
} from "./firestore-admin-user-repository.js";
