import {
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export interface FirebaseAdminConfig {
  readonly projectId: string;
  readonly authEmulatorHost?: string;
  readonly firestoreEmulatorHost?: string;
  readonly storageEmulatorHost?: string;
  readonly storageEmulatorPublicHost?: string;
  readonly storageBucket?: string;
  readonly serviceAccountJson?: string;
}

function resolveCredential(serviceAccountJson?: string) {
  if (!serviceAccountJson) return undefined;
  try {
    const parsed = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    return cert(parsed);
  } catch {
    return undefined;
  }
}

export function initializeFirebaseAdmin(config: FirebaseAdminConfig): App {
  if (config.authEmulatorHost) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = config.authEmulatorHost;
  }
  if (config.firestoreEmulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = config.firestoreEmulatorHost;
  }
  if (config.storageEmulatorHost) {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = config.storageEmulatorHost;
  }

  const existing = getApps()[0];
  if (existing) return existing;

  const credential = resolveCredential(config.serviceAccountJson);
  const storageBucket =
    config.storageBucket?.trim() || `${config.projectId}.appspot.com`;
  const options: AppOptions = {
    projectId: config.projectId,
    storageBucket,
    ...(credential ? { credential } : {}),
  };

  return initializeApp(options);
}

let firestoreSettingsApplied = false;

export function getFirestoreAdmin(config: FirebaseAdminConfig): Firestore {
  const app = initializeFirebaseAdmin(config);
  const firestore = getFirestore(app);
  if (!firestoreSettingsApplied) {
    firestore.settings({ ignoreUndefinedProperties: true });
    firestoreSettingsApplied = true;
  }
  return firestore;
}
