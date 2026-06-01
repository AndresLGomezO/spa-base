import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { createRatesRecordSeedContext } from "../seed-helpers.js";
import { seedSharedLookupRecords } from "./shared-lookups.js";
import { seedTestUserBusinessRecords } from "./test-user-business.js";

export async function seedRatesLookupRecords(
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): Promise<void> {
  const context = createRatesRecordSeedContext(
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );
  await seedSharedLookupRecords(context);
}

export async function seedRatesBusinessRecordsForOwner(
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): Promise<void> {
  const context = createRatesRecordSeedContext(
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );
  await seedTestUserBusinessRecords(context);
}
