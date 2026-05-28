import { getAppCheck } from "firebase-admin/app-check";

import {
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

export async function verifyFirebaseAppCheckToken(
  appCheckToken: string,
  config: FirebaseAdminConfig,
) {
  initializeFirebaseAdmin(config);

  if (config.authEmulatorHost) {
    return { appId: "emulator", token: appCheckToken };
  }

  return getAppCheck().verifyToken(appCheckToken);
}
