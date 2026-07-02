import { platformRoleConverter } from "@repo/firestore-converters";
import { ROLES_COLLECTION, type PlatformRole } from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { runFirestoreTransactionWithRetry } from "./firestore-transaction-retry.js";

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

    await runFirestoreTransactionWithRetry(firestore, async (transaction) => {
      const existing = await transaction.get(docRef);
      const nowIso = new Date().toISOString();

      if (existing.exists) {
        const current = platformRoleConverter.read(existing.data());
        const mergedGrants = [...new Set([...current.grants, ...grants])];
        if (mergedGrants.length === current.grants.length) {
          return;
        }

        transaction.set(
          docRef,
          platformRoleConverter.write({
            ...current,
            grants: mergedGrants,
            updatedAt: nowIso,
          }),
        );
        return;
      }

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
