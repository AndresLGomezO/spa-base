import { cert, getApps, initializeApp, type App, type AppOptions } from "firebase-admin/app";

export interface FirebaseAdminConfig {
  readonly projectId: string;
  readonly authEmulatorHost?: string;
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

  const existing = getApps()[0];
  if (existing) return existing;

  const credential = resolveCredential(config.serviceAccountJson);
  const options: AppOptions = {
    projectId: config.projectId,
    ...(credential ? { credential } : {}),
  };

  return initializeApp(options);
}
