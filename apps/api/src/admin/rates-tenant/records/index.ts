import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { createRatesRecordSeedContext } from "../seed-record-helpers.js";
import { seedRatesDemoRecords } from "./seed-demo-data.js";
import { seedRatesJoinRelations } from "./seed-join-relations.js";

export async function seedRatesBusinessRecords(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): Promise<void> {
  const context = createRatesRecordSeedContext(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );
  await seedRatesDemoRecords(context);
  await seedRatesJoinRelations(context);
}
