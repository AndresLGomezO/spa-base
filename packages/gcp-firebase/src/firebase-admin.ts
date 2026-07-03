import {
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

export { FieldValue };

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

export function getFirebaseAdminApp(config: FirebaseAdminConfig): App {
  return initializeFirebaseAdmin(config);
}

const CONFIGURED_FIRESTORE_INSTANCES_KEY =
  "__repoGcpFirebaseConfiguredFirestoreInstances";

function getConfiguredFirestoreInstances(): WeakSet<Firestore> {
  const globalRef = globalThis as typeof globalThis & {
    [CONFIGURED_FIRESTORE_INSTANCES_KEY]?: WeakSet<Firestore>;
  };
  if (!globalRef[CONFIGURED_FIRESTORE_INSTANCES_KEY]) {
    globalRef[CONFIGURED_FIRESTORE_INSTANCES_KEY] = new WeakSet<Firestore>();
  }
  return globalRef[CONFIGURED_FIRESTORE_INSTANCES_KEY];
}

function isFirestoreAlreadyInitializedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Firestore has already been initialized")
  );
}

function applyFirestoreSettings(firestore: Firestore): void {
  const configuredInstances = getConfiguredFirestoreInstances();
  if (configuredInstances.has(firestore)) {
    return;
  }

  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    if (!isFirestoreAlreadyInitializedError(error)) {
      throw error;
    }
  }

  configuredInstances.add(firestore);
}

export function getFirestoreAdmin(config: FirebaseAdminConfig): Firestore {
  const app = initializeFirebaseAdmin(config);
  const firestore = getFirestore(app);
  applyFirestoreSettings(firestore);
  return firestore;
}
