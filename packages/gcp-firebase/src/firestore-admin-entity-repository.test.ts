import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createVersionedConverter } from "@repo/firestore-converters";

import { createFirestoreAdminEntityRepository } from "./firestore-admin-entity-repository.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

const emulatorConfigured = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const widgetSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  email: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type WidgetRecord = z.infer<typeof widgetSchema>;

const WIDGETS_COLLECTION = "widgets";
const widgetConverter = createVersionedConverter({
  currentVersion: 1,
  domainSchema: widgetSchema,
  persistedSchema: widgetSchema
    .extend({ _schemaVersion: z.literal(1) })
    .strict(),
  migrations: {},
  fromPersisted: (persisted) => {
    const domain = { ...persisted } as Record<string, unknown>;
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain as WidgetRecord;
  },
  toPersisted: (domain) => domain,
});

const firebaseConfig = {
  projectId: process.env.GCP_PROJECT_ID ?? "demo-project-base",
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
};

function createWidgetRecord(
  overrides: Partial<WidgetRecord> = {},
): WidgetRecord {
  const now = new Date().toISOString();
  return {
    id: `widget_${Math.random().toString(36).slice(2, 10)}`,
    tenantId: "tenant_a",
    name: "Test Widget",
    email: "test@example.com",
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
      typeof createFirestoreAdminEntityRepository<WidgetRecord>
    >;

    beforeEach(async () => {
      repository = createFirestoreAdminEntityRepository({
        config: firebaseConfig,
        collection: WIDGETS_COLLECTION,
        converter: widgetConverter,
      });

      const firestore = getFirestoreAdmin(firebaseConfig);
      const tenants = ["tenant_a", "tenant_b"];
      for (const tenantId of tenants) {
        const collectionRef = tenantEntityCollectionRef(
          firestore,
          tenantId,
          WIDGETS_COLLECTION,
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
          WIDGETS_COLLECTION,
        );
        const snapshot = await collectionRef.get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      }
    });

    it("creates a record with id, tenantId, and timestamps", async () => {
      const record = createWidgetRecord({ id: "widget_create_test" });
      const created = await repository.create("tenant_a", record);

      expect(created.id).toBe("widget_create_test");
      expect(created.tenantId).toBe("tenant_a");
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();

      const firestore = getFirestoreAdmin(firebaseConfig);
      const snapshot = await tenantEntityCollectionRef(
        firestore,
        "tenant_a",
        WIDGETS_COLLECTION,
      )
        .doc("widget_create_test")
        .get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?._schemaVersion).toBe(1);
    });

    it("findAll returns only tenant-scoped records", async () => {
      await repository.create(
        "tenant_a",
        createWidgetRecord({ id: "widget_a1", name: "Tenant A" }),
      );
      await repository.create(
        "tenant_b",
        createWidgetRecord({
          id: "widget_b1",
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
        createWidgetRecord({ id: "widget_isolated" }),
      );

      const wrongTenant = await repository.findById(
        "widget_isolated",
        "tenant_b",
      );
      expect(wrongTenant).toBeNull();
    });

    it("findByField equality lookup does not require a composite index", async () => {
      await repository.create(
        "tenant_a",
        createWidgetRecord({ id: "widget_name_a", name: "Netflix" }),
      );
      await repository.create(
        "tenant_a",
        createWidgetRecord({ id: "widget_name_b", name: "Other" }),
      );

      const result = await repository.findByField({
        tenantId: "tenant_a",
        field: "name",
        value: "Netflix",
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("widget_name_a");
      expect(result.nextCursor).toBeNull();
    });

    it("updates a record and refreshes updatedAt", async () => {
      const record = createWidgetRecord({ id: "widget_update" });
      await repository.create("tenant_a", record);

      const updated = await repository.update("widget_update", "tenant_a", {
        email: "updated@example.com",
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      });

      expect(updated?.email).toBe("updated@example.com");
      expect(updated?.updatedAt).not.toBe(record.updatedAt);
    });

    it("deletes a record", async () => {
      await repository.create(
        "tenant_a",
        createWidgetRecord({ id: "widget_delete" }),
      );

      const deleted = await repository.delete("widget_delete", "tenant_a");
      expect(deleted).toBe(true);

      const missing = await repository.findById("widget_delete", "tenant_a");
      expect(missing).toBeNull();
    });
  },
);
