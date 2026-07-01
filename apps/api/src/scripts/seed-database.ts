import { createFirestoreAdminEntityDefinitionRepository } from "@repo/gcp-firebase";

import { seedPlatformRoles } from "../admin/seed-platform-roles.js";
import { seedPlatformTenants } from "../admin/seed-platform-tenants.js";
import { RATES_TENANT_ID } from "../admin/rates-tenant/constants.js";
import { apiEnv } from "../config/env.js";
import { createEntityRuntimeContext } from "../entities/entity-runtime-context.js";

function buildFirebaseAdminConfig() {
  return {
    projectId: apiEnv.GCP_PROJECT_ID,
    authEmulatorHost: apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: apiEnv.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: apiEnv.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: apiEnv.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: apiEnv.GCP_STORAGE_BUCKET,
  };
}

export async function runDatabaseSeed(): Promise<void> {
  const firebaseAdminConfig = buildFirebaseAdminConfig();
  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
    definitionCacheTtlMs: apiEnv.CACHE_TTL_MS,
    cursorSecret: apiEnv.QUERY_CURSOR_SECRET,
    clientFallbackMaxDocs: apiEnv.CLIENT_QUERY_FALLBACK_MAX_DOCS,
    ensureFirestoreIndexes: false,
    indexProvisioningExcludedTenants: new Set([RATES_TENANT_ID]),
  });

  console.log("[seed] Seeding platform roles...");
  await seedPlatformRoles(firebaseAdminConfig);

  console.log("[seed] Seeding platform tenants (rates catalog + demo data)...");
  await seedPlatformTenants(firebaseAdminConfig, entityRuntime);

  console.log("[seed] Database seed complete.");
}

async function main(): Promise<void> {
  await runDatabaseSeed();
}

void main().catch((error) => {
  console.error("[seed] Failed:", error);
  process.exit(1);
});
