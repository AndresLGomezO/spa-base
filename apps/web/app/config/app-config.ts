import { AppEnvSchema, type AppEnv } from "@repo/shared-types";

interface FirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
  readonly authEmulatorHost: string;
}

interface AppConfig {
  readonly env: AppEnv;
  readonly apiBaseUrl: string;
  readonly firebase: FirebaseConfig;
}

function normalizeEnvMode(value: string | undefined): AppEnv {
  const parsed = AppEnvSchema.safeParse(value);
  return parsed.success ? parsed.data : "dev";
}

function readEnv(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

export const appConfig: Readonly<AppConfig> = Object.freeze({
  env: normalizeEnvMode(import.meta.env.VITE_ENV),
  apiBaseUrl: readEnv("VITE_API_URL", "http://127.0.0.1:3000"),
  firebase: {
    apiKey: readEnv("VITE_FIREBASE_API_KEY", "fake-api-key"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN", "localhost"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID", "demo-project-base"),
    storageBucket: readEnv(
      "VITE_FIREBASE_STORAGE_BUCKET",
      "demo-project-base.appspot.com",
    ),
    messagingSenderId: readEnv(
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      "123456789",
    ),
    appId: readEnv("VITE_FIREBASE_APP_ID", "1:123456789:web:abcdef"),
    authEmulatorHost: readEnv(
      "VITE_FIREBASE_AUTH_EMULATOR_HOST",
      "127.0.0.1:9099",
    ),
  },
});
