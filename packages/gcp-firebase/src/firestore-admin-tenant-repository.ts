import type {
  CreateTenantInput,
  TenantRepository,
  UpdateTenantInput,
} from "@repo/firestore-converters";
import { tenantConverter } from "@repo/firestore-converters";
import {
  TENANTS_COLLECTION,
  tenantSchemaV1,
  type Tenant,
} from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

function slugifyTenantId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug.length > 0 ? slug : "tenant";
}

class FirestoreAdminTenantRepositoryImpl implements TenantRepository {
  constructor(private readonly config: FirebaseAdminConfig) {}

  private get collection() {
    return getFirestoreAdmin(this.config).collection(TENANTS_COLLECTION);
  }

  async list(
    params: { status?: Tenant["status"] } = {},
  ): Promise<readonly Tenant[]> {
    const snapshot = await this.collection.get();
    let tenants = snapshot.docs.map((doc) => tenantConverter.read(doc.data()));

    if (params.status) {
      tenants = tenants.filter((tenant) => tenant.status === params.status);
    }

    return tenants.sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<Tenant | null> {
    const parsedId = id.trim();
    if (!parsedId) return null;

    const snapshot = await this.collection.doc(parsedId).get();
    if (!snapshot.exists) return null;

    return tenantConverter.read(snapshot.data());
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Tenant name is required.");
    }

    const id = (input.id?.trim() || slugifyTenantId(name)).slice(0, 128);
    if (!id) {
      throw new Error("Tenant id is required.");
    }

    const firestore = getFirestoreAdmin(this.config);
    const docRef = this.collection.doc(id);

    return firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        throw new Error(`Tenant already exists: ${id}`);
      }

      const nowIso = new Date().toISOString();
      const tenant = tenantSchemaV1.parse({
        id,
        name,
        status: "active",
        createdBy: input.createdBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      transaction.set(docRef, tenantConverter.write(tenant), { merge: false });
      return tenant;
    });
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const parsedId = id.trim();
    if (!parsedId) return null;

    const firestore = getFirestoreAdmin(this.config);
    const docRef = this.collection.doc(parsedId);

    return firestore.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(docRef);
      if (!existingSnapshot.exists) {
        return null;
      }

      const existing = tenantConverter.read(existingSnapshot.data());
      const nextTenant = tenantSchemaV1.parse({
        ...existing,
        name: input.name !== undefined ? input.name.trim() : existing.name,
        status: input.status ?? existing.status,
        updatedAt: new Date().toISOString(),
      });

      transaction.set(docRef, tenantConverter.write(nextTenant), {
        merge: false,
      });
      return nextTenant;
    });
  }

  async ensureTenant(
    id: string,
    name: string,
    createdBy: string | null,
  ): Promise<void> {
    const parsedId = id.trim();
    const parsedName = name.trim();
    if (!parsedId || !parsedName) return;

    const firestore = getFirestoreAdmin(this.config);
    const docRef = this.collection.doc(parsedId);

    await firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        return;
      }

      const nowIso = new Date().toISOString();
      const tenant = tenantSchemaV1.parse({
        id: parsedId,
        name: parsedName,
        status: "active",
        createdBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      transaction.set(docRef, tenantConverter.write(tenant), { merge: false });
    });
  }
}

export function createFirestoreAdminTenantRepository(
  config: FirebaseAdminConfig,
) {
  return new FirestoreAdminTenantRepositoryImpl(config);
}

export type FirestoreAdminTenantRepository = ReturnType<
  typeof createFirestoreAdminTenantRepository
>;
