import { platformRoleConverter } from "@repo/firestore-converters";
import { ROLES_COLLECTION, type PlatformRole } from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

class FirestoreAdminPlatformRoleRepositoryImpl {
  constructor(private readonly config: FirebaseAdminConfig) {}

  private get collection() {
    return getFirestoreAdmin(this.config).collection(ROLES_COLLECTION);
  }

  async listGlobal(): Promise<readonly PlatformRole[]> {
    const snapshot = await this.collection.where("tenantId", "==", null).get();
    return snapshot.docs.map((doc) => platformRoleConverter.read(doc.data()));
  }

  async getByName(name: string): Promise<PlatformRole | null> {
    const parsedName = name.trim();
    if (!parsedName) return null;

    const snapshot = await this.collection.doc(parsedName).get();
    if (!snapshot.exists) return null;

    return platformRoleConverter.read(snapshot.data());
  }

  async ensureGlobalRole(
    name: string,
    grants: readonly string[],
  ): Promise<void> {
    const parsedName = name.trim();
    if (!parsedName || grants.length === 0) return;

    const firestore = getFirestoreAdmin(this.config);
    const docRef = this.collection.doc(parsedName);

    await firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        return;
      }

      const nowIso = new Date().toISOString();
      const role: PlatformRole = {
        name: parsedName,
        grants: [...grants],
        tenantId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      transaction.set(docRef, platformRoleConverter.write(role), {
        merge: false,
      });
    });
  }
}

export function createFirestoreAdminPlatformRoleRepository(
  config: FirebaseAdminConfig,
) {
  return new FirestoreAdminPlatformRoleRepositoryImpl(config);
}

export type FirestoreAdminPlatformRoleRepository = ReturnType<
  typeof createFirestoreAdminPlatformRoleRepository
>;
