import type { FirebaseApp } from "firebase/app";
import {
  type AppCheck,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";

import { appConfig } from "../config/app-config";

const EMULATOR_APP_CHECK_HEADER = "emulator";

let appCheck: AppCheck | undefined;
let useEmulatorStub = false;

export function initFirebaseAppCheck(app: FirebaseApp): void {
  if (appConfig.firebase.authEmulatorHost) {
    useEmulatorStub = true;
    return;
  }

  const siteKey = appConfig.appCheckRecaptchaSiteKey;
  if (!siteKey) {
    return;
  }

  if (import.meta.env.DEV && appConfig.appCheckDebugToken) {
    (
      globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
      }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = appConfig.appCheckDebugToken;
  }

  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export async function getAppCheckHeaderValue(): Promise<string> {
  if (useEmulatorStub) {
    return EMULATOR_APP_CHECK_HEADER;
  }

  if (!appCheck) {
    throw new Error(
      "App Check is not configured. Set VITE_APP_CHECK_RECAPTCHA_SITE_KEY for deployed builds, or VITE_FIREBASE_AUTH_EMULATOR_HOST for local emulator development.",
    );
  }

  const { token } = await getToken(appCheck, false);
  return token;
}
