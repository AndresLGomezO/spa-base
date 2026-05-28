import {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
  registeredUserConverter,
  type RegisteredUserRepository,
} from "@repo/firestore-converters";
import {
  USERS_COLLECTION,
  registeredUserSchemaV1,
  type AuthUserProjection,
  type RegisteredUser,
} from "@repo/shared-types";
import { type UserRecord } from "firebase-admin/auth";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toIsoDateString(value: string | null | undefined): string | null {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  if (Number.isNaN(milliseconds)) return null;
  return new Date(milliseconds).toISOString();
}

export function mapFirebaseUserRecordToAuthUserProjection(
  userRecord: UserRecord,
): AuthUserProjection {
  return {
    uid: userRecord.uid,
    email: normalizeOptionalString(userRecord.email),
    emailVerified: userRecord.emailVerified,
    displayName: normalizeOptionalString(userRecord.displayName),
    photoURL: normalizeOptionalString(userRecord.photoURL),
    phoneNumber: normalizeOptionalString(userRecord.phoneNumber),
    disabled: userRecord.disabled,
    providers: userRecord.providerData.map((provider) => ({
      providerId: provider.providerId,
      uid: normalizeOptionalString(provider.uid),
      email: normalizeOptionalString(provider.email),
      displayName: normalizeOptionalString(provider.displayName),
      photoURL: normalizeOptionalString(provider.photoURL),
      phoneNumber: normalizeOptionalString(provider.phoneNumber),
    })),
    authCreatedAt: toIsoDateString(userRecord.metadata.creationTime),
    authLastSignInAt: toIsoDateString(userRecord.metadata.lastSignInTime),
  };
}

class FirestoreAdminRegisteredUserRepository implements RegisteredUserRepository {
  constructor(private readonly config: FirebaseAdminConfig) {}

  async getByUid(uid: string): Promise<RegisteredUser | null> {
    const parsedUid = uid.trim();
    if (!parsedUid) return null;

    const firestore = getFirestoreAdmin(this.config);
    const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .doc(parsedUid)
      .get();
    if (!snapshot.exists) return null;

    return registeredUserConverter.read(snapshot.data());
  }

  async upsertFromAuthUser(
    authUser: AuthUserProjection,
  ): Promise<RegisteredUser> {
    const parsedAuthUser = registeredUserSchemaV1.pick({ uid: true }).parse({
      uid: authUser.uid,
    });

    const firestore = getFirestoreAdmin(this.config);
    const userDocRef = firestore
      .collection(USERS_COLLECTION)
      .doc(parsedAuthUser.uid);

    return firestore.runTransaction(async (transaction) => {
      const nowIso = new Date().toISOString();
      const existingSnapshot = await transaction.get(userDocRef);
      const nextUser = existingSnapshot.exists
        ? mergeRegisteredUserFromAuthUser(
            registeredUserConverter.read(existingSnapshot.data()),
            authUser,
            nowIso,
          )
        : createRegisteredUserFromAuthUser(authUser, nowIso);

      const persisted = registeredUserConverter.write(nextUser);
      transaction.set(userDocRef, persisted, { merge: false });
      return nextUser;
    });
  }
}

export function createFirestoreAdminRegisteredUserRepository(
  config: FirebaseAdminConfig,
): RegisteredUserRepository {
  return new FirestoreAdminRegisteredUserRepository(config);
}
