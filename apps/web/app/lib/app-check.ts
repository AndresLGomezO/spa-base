import { appConfig } from "../config/app-config";

const EMULATOR_APP_CHECK_HEADER = "emulator";

export async function getAppCheckHeaderValue(): Promise<string> {
  if (appConfig.firebase.authEmulatorHost) {
    return EMULATOR_APP_CHECK_HEADER;
  }

  // Production: replace with initializeAppCheck + getToken when App Check is configured.
  return EMULATOR_APP_CHECK_HEADER;
}
