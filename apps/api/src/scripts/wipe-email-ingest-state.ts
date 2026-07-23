/**
 * One-shot: delete email ledger rows + ingest processed/fingerprints for the local tenant.
 * Usage: pnpm exec tsx --env-file=apps/api/.env.dev apps/api/src/scripts/wipe-email-ingest-state.ts
 */
import { existsSync } from "node:fs";

import { getFirestoreAdmin } from "@repo/gcp-firebase";
import {
  EMAIL_INGEST_FINGERPRINTS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
} from "@repo/gmail-ingest";

import { tryLoadLocalTenantConfig } from "../admin/local-tenant-seed/load-tenant-config.js";
import { apiEnv } from "../config/env.js";

type AdminFirestore = ReturnType<typeof getFirestoreAdmin>;
type AdminQuery = ReturnType<AdminFirestore["collection"]>;

function isInsideDocker(): boolean {
  return existsSync("/.dockerenv");
}

function normalizeEmulatorHost(
  host: string | undefined,
  serviceName: string,
): string | undefined {
  if (!host || isInsideDocker()) {
    return host;
  }
  const [name, port] = host.split(":");
  if (name === serviceName && port) {
    return `127.0.0.1:${port}`;
  }
  return host;
}

async function deleteQueryBatch(
  db: AdminFirestore,
  query: AdminQuery,
  label: string,
): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) {
      break;
    }
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      deleted += 1;
    }
    await batch.commit();
  }
  console.log(`[wipe] ${label}: deleted ${deleted}`);
  return deleted;
}

async function main(): Promise<void> {
  const tenantConfig = tryLoadLocalTenantConfig();
  if (!tenantConfig) {
    throw new Error(
      "Local tenant config not found. Create .local/tenant-import/tenant.json before wiping email ingest state.",
    );
  }

  const firestoreEmulatorHost = normalizeEmulatorHost(
    apiEnv.FIRESTORE_EMULATOR_HOST,
    "firebase-emulator",
  );
  const db = getFirestoreAdmin({
    projectId: apiEnv.GCP_PROJECT_ID,
    firestoreEmulatorHost,
  });

  const tenantRef = db.collection("tenants").doc(tenantConfig.id);
  await deleteQueryBatch(db, tenantRef.collection("emails"), "emails");
  await deleteQueryBatch(
    db,
    tenantRef.collection(EMAIL_INGEST_PROCESSED_COLLECTION),
    EMAIL_INGEST_PROCESSED_COLLECTION,
  );
  await deleteQueryBatch(
    db,
    tenantRef.collection(EMAIL_INGEST_FINGERPRINTS_COLLECTION),
    EMAIL_INGEST_FINGERPRINTS_COLLECTION,
  );
  await deleteQueryBatch(
    db,
    tenantRef.collection("__email_ingest_jobs"),
    "__email_ingest_jobs",
  );
  console.log("[wipe] done");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
