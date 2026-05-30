import {
  tenantUserInviteRecordSchema,
  TENANT_USER_INVITES_SUBCOLLECTION,
  type TenantUserInviteRecord,
  type TenantUserInviteRepository,
} from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

class FirestoreAdminTenantUserInviteRepository implements TenantUserInviteRepository {
  constructor(private readonly config: FirebaseAdminConfig) {}

  private collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(this.config),
      tenantId,
      TENANT_USER_INVITES_SUBCOLLECTION,
    );
  }

  async list(tenantId: string): Promise<readonly TenantUserInviteRecord[]> {
    const snapshot = await this.collection(tenantId).get();
    return snapshot.docs.map((doc) =>
      tenantUserInviteRecordSchema.parse({ id: doc.id, ...doc.data() }),
    );
  }

  async getByEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantUserInviteRecord | null> {
    const normalized = normalizeEmail(email);
    const snapshot = await this.collection(tenantId)
      .where("email", "==", normalized)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    if (!doc) return null;
    return tenantUserInviteRecordSchema.parse({ id: doc.id, ...doc.data() });
  }

  async create(
    tenantId: string,
    input: { readonly email: string; readonly roles: readonly string[] },
  ): Promise<TenantUserInviteRecord> {
    const normalized = normalizeEmail(input.email);
    const existing = await this.getByEmail(tenantId, normalized);
    if (existing) {
      throw new Error(`Invite already exists for ${normalized}.`);
    }

    const now = new Date().toISOString();
    const record = tenantUserInviteRecordSchema.parse({
      id: `invite_${nanoid(12)}`,
      tenantId,
      email: normalized,
      roles: [...input.roles],
      createdAt: now,
    });
    await this.collection(tenantId).doc(record.id).set({
      tenantId: record.tenantId,
      email: record.email,
      roles: record.roles,
      createdAt: record.createdAt,
    });
    return record;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.collection(tenantId).doc(id).delete();
  }

  async deleteByEmail(tenantId: string, email: string): Promise<void> {
    const existing = await this.getByEmail(tenantId, email);
    if (existing) {
      await this.delete(tenantId, existing.id);
    }
  }

  async listPendingForEmail(
    email: string,
  ): Promise<readonly TenantUserInviteRecord[]> {
    const normalized = normalizeEmail(email);
    const firestore = getFirestoreAdmin(this.config);
    const snapshot = await firestore
      .collectionGroup(TENANT_USER_INVITES_SUBCOLLECTION)
      .where("email", "==", normalized)
      .get();
    return snapshot.docs.map((doc) =>
      tenantUserInviteRecordSchema.parse({ id: doc.id, ...doc.data() }),
    );
  }
}

export function createFirestoreAdminTenantUserInviteRepository(
  config: FirebaseAdminConfig,
): TenantUserInviteRepository {
  return new FirestoreAdminTenantUserInviteRepository(config);
}

export { TENANT_USER_INVITES_SUBCOLLECTION };
