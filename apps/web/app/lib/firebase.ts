import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  type User,
} from "firebase/auth";

import { appConfig } from "../config/app-config";

import { registerFirebaseAppForAppCheck } from "./firebase-app-check";

export { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User };

const app = initializeApp({
  apiKey: appConfig.firebase.apiKey,
  authDomain: appConfig.firebase.authDomain,
  projectId: appConfig.firebase.projectId,
  storageBucket: appConfig.firebase.storageBucket,
  messagingSenderId: appConfig.firebase.messagingSenderId,
  appId: appConfig.firebase.appId,
});

export const auth = getAuth(app);

void setPersistence(auth, browserLocalPersistence);

if (appConfig.firebase.authEmulatorHost) {
  const emulatorUrl = appConfig.firebase.authEmulatorHost.startsWith("http")
    ? appConfig.firebase.authEmulatorHost
    : `http://${appConfig.firebase.authEmulatorHost}`;

  connectAuthEmulator(
    auth,
    emulatorUrl,
    appConfig.firebase.authEmulatorDisableWarnings
      ? { disableWarnings: true }
      : undefined,
  );
}

registerFirebaseAppForAppCheck(app);

export async function signOut(): Promise<void> {
  await auth.signOut();
}
