import {
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

export function resolveFirebaseAdminConfig(projectId: string): FirebaseAdminConfig {
  return {
    projectId,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: process.env.GCP_STORAGE_BUCKET,
  };
}

export function initFirestore(projectId: string) {
  const config = resolveFirebaseAdminConfig(projectId);
  initializeFirebaseAdmin(config);
  return config;
}
