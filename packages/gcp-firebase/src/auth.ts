import { getAuth } from "firebase-admin/auth";

import {
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

export async function verifyFirebaseIdToken(
  idToken: string,
  config: FirebaseAdminConfig,
) {
  initializeFirebaseAdmin(config);
  return getAuth().verifyIdToken(idToken);
}
