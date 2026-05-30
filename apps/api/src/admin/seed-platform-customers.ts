import { Customer } from "@repo/shared-types";
import { customerConverter } from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

const DEV_TENANTS = ["tenant_dev_1", "tenant_dev_2"] as const;

const SEED_CUSTOMERS = [
  { name: "Acme Corp", email: "contact@acme.example", isActive: true },
  { name: "Globex Industries", email: "hello@globex.example", isActive: true },
  { name: "Inactive Co", email: "info@inactive.example", isActive: false },
] as const;

export async function seedPlatformCustomers(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<void> {
  const repository = createFirestoreAdminEntityRepository({
    config: firebaseAdminConfig,
    collection: Customer.metadata.collection,
    converter: customerConverter,
  });

  const now = new Date().toISOString();

  for (const tenantId of DEV_TENANTS) {
    for (const seed of SEED_CUSTOMERS) {
      const id = `seed_${tenantId}_${seed.name.toLowerCase().replace(/\s+/g, "_")}`;
      const existing = await repository.findById(tenantId, id);
      if (existing) {
        continue;
      }

      await repository.create(tenantId, {
        id,
        tenantId,
        name: seed.name,
        email: seed.email,
        isActive: seed.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
