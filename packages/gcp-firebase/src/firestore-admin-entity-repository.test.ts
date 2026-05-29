import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { customerConverter } from "@repo/firestore-converters";
import { CUSTOMERS_COLLECTION, type CustomerRecord } from "@repo/shared-types";

import { createFirestoreAdminEntityRepository } from "./firestore-admin-entity-repository.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

const emulatorConfigured = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const firebaseConfig = {
  projectId: process.env.GCP_PROJECT_ID ?? "demo-project-base",
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
};

function createCustomerRecord(
  overrides: Partial<CustomerRecord> = {},
): CustomerRecord {
  const now = new Date().toISOString();
  return {
    id: `cust_${Math.random().toString(36).slice(2, 10)}`,
    tenantId: "tenant_a",
    name: "Test Customer",
    email: "test@example.com",
    age: 25,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe.skipIf(!emulatorConfigured)(
  "createFirestoreAdminEntityRepository (Firestore emulator)",
  () => {
    let repository: ReturnType<
      typeof createFirestoreAdminEntityRepository<CustomerRecord>
    >;

    beforeEach(async () => {
      repository = createFirestoreAdminEntityRepository({
        config: firebaseConfig,
        collection: CUSTOMERS_COLLECTION,
        converter: customerConverter,
      });

      const firestore = getFirestoreAdmin(firebaseConfig);
      const tenants = ["tenant_a", "tenant_b"];
      for (const tenantId of tenants) {
        const collectionRef = tenantEntityCollectionRef(
          firestore,
          tenantId,
          CUSTOMERS_COLLECTION,
        );
        const snapshot = await collectionRef.get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      }
    });

    afterEach(async () => {
      const firestore = getFirestoreAdmin(firebaseConfig);
      const tenants = ["tenant_a", "tenant_b"];
      for (const tenantId of tenants) {
        const collectionRef = tenantEntityCollectionRef(
          firestore,
          tenantId,
          CUSTOMERS_COLLECTION,
        );
        const snapshot = await collectionRef.get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      }
    });

    it("creates a record with id, tenantId, and timestamps", async () => {
      const record = createCustomerRecord({ id: "cust_create_test" });
      const created = await repository.create("tenant_a", record);

      expect(created.id).toBe("cust_create_test");
      expect(created.tenantId).toBe("tenant_a");
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();

      const firestore = getFirestoreAdmin(firebaseConfig);
      const snapshot = await tenantEntityCollectionRef(
        firestore,
        "tenant_a",
        CUSTOMERS_COLLECTION,
      )
        .doc("cust_create_test")
        .get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?._schemaVersion).toBe(1);
    });

    it("findAll returns only tenant-scoped records", async () => {
      await repository.create(
        "tenant_a",
        createCustomerRecord({ id: "cust_a1", name: "Tenant A" }),
      );
      await repository.create(
        "tenant_b",
        createCustomerRecord({
          id: "cust_b1",
          tenantId: "tenant_b",
          name: "Tenant B",
        }),
      );

      const result = await repository.findAll({ tenantId: "tenant_a" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe("Tenant A");
    });

    it("findById returns null for wrong tenant path", async () => {
      await repository.create(
        "tenant_a",
        createCustomerRecord({ id: "cust_isolated" }),
      );

      const wrongTenant = await repository.findById(
        "cust_isolated",
        "tenant_b",
      );
      expect(wrongTenant).toBeNull();
    });

    it("updates a record and refreshes updatedAt", async () => {
      const record = createCustomerRecord({ id: "cust_update" });
      await repository.create("tenant_a", record);

      const updated = await repository.update("cust_update", "tenant_a", {
        email: "updated@example.com",
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      });

      expect(updated?.email).toBe("updated@example.com");
      expect(updated?.updatedAt).not.toBe(record.updatedAt);
    });

    it("deletes a record", async () => {
      await repository.create(
        "tenant_a",
        createCustomerRecord({ id: "cust_delete" }),
      );

      const deleted = await repository.delete("cust_delete", "tenant_a");
      expect(deleted).toBe(true);

      const missing = await repository.findById("cust_delete", "tenant_a");
      expect(missing).toBeNull();
    });
  },
);
