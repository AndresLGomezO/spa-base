import {
  createRegisteredUserFromAuthUser,
  mergeRegisteredUserFromAuthUser,
  registeredUserConverter,
  type RegisteredUserRepository,
  type RegisteredUserUpsertResult,
  type UpdateRegisteredUserAccessInput,
} from "@repo/firestore-converters";
import {
  registeredUserSchemaV1,
  USERS_COLLECTION,
  type AuthUserProjection,
  type RegisteredUser,
} from "@repo/shared-types";
import { type UserRecord } from "firebase-admin/auth";
import { FieldPath } from "firebase-admin/firestore";

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
  ): Promise<RegisteredUserUpsertResult> {
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
      const created = !existingSnapshot.exists;
      const nextUser = existingSnapshot.exists
        ? mergeRegisteredUserFromAuthUser(
            registeredUserConverter.read(existingSnapshot.data()),
            authUser,
            nowIso,
          )
        : createRegisteredUserFromAuthUser(authUser, nowIso);

      const persisted = registeredUserConverter.write(nextUser);
      transaction.set(userDocRef, persisted, { merge: false });
      return { user: nextUser, created };
    });
  }

  async list(params: { limit?: number; cursor?: string } = {}) {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const firestore = getFirestoreAdmin(this.config);
    let query = firestore
      .collection(USERS_COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(limit + 1);

    const cursor = params.cursor?.trim();
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    return {
      items: pageDocs.map((doc) => registeredUserConverter.read(doc.data())),
      nextCursor: hasMore ? (pageDocs.at(-1)?.id ?? null) : null,
    };
  }

  async findByEmail(email: string): Promise<RegisteredUser | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const firestore = getFirestoreAdmin(this.config);
    const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where("email", "==", normalized)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    if (!doc) return null;
    return registeredUserConverter.read(doc.data());
  }

  async updateAccess(
    uid: string,
    data: UpdateRegisteredUserAccessInput,
  ): Promise<RegisteredUser | null> {
    const parsedUid = uid.trim();
    if (!parsedUid) return null;

    const firestore = getFirestoreAdmin(this.config);
    const userDocRef = firestore.collection(USERS_COLLECTION).doc(parsedUid);

    return firestore.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(userDocRef);
      if (!existingSnapshot.exists) {
        return null;
      }

      const existing = registeredUserConverter.read(existingSnapshot.data());
      const nowIso = new Date().toISOString();
      const nextUser = registeredUserSchemaV1.parse({
        ...existing,
        platformRole:
          data.platformRole !== undefined
            ? data.platformRole
            : (existing.platformRole ?? null),
        tenants:
          data.tenants !== undefined ? data.tenants : (existing.tenants ?? {}),
        updatedAt: nowIso,
      });

      transaction.set(userDocRef, registeredUserConverter.write(nextUser), {
        merge: false,
      });
      return nextUser;
    });
  }
}

export function createFirestoreAdminRegisteredUserRepository(
  config: FirebaseAdminConfig,
): RegisteredUserRepository {
  return new FirestoreAdminRegisteredUserRepository(config);
}
