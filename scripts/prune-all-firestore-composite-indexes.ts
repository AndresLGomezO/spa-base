/**
 * Delete all Firestore composite indexes in a GCP project.
 * Optionally clears __index_status tracking documents.
 *
 * After running, re-save entity models (or POST /api/indexes/provision) to
 * recreate indexes from the curated catalog.
 *
 * Usage:
 *   pnpm prune:firestore-indexes -- --dry-run
 *   GCP_PROJECT_ID=entitysystem-development pnpm prune:firestore-indexes -- --confirm
 *   GCP_PROJECT_ID=entitysystem-development pnpm prune:firestore-indexes -- --confirm --no-clear-status
 */

import { execSync } from "node:child_process";

import { INDEX_STATUS_COLLECTION } from "@repo/gcp-firebase";
import { getFirestoreAdmin, initializeFirebaseAdmin } from "@repo/gcp-firebase/firebase-admin";

function parseArgs(argv: readonly string[]): {
  readonly dryRun: boolean;
  readonly confirm: boolean;
  readonly clearStatus: boolean;
  readonly projectId: string;
} {
  let dryRun = false;
  let confirm = false;
  let clearStatus = true;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--confirm") {
      confirm = true;
    } else if (arg === "--no-clear-status") {
      clearStatus = false;
    }
  }

  const projectId = process.env.GCP_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "Set GCP_PROJECT_ID (e.g. entitysystem-development).",
    );
  }

  return { dryRun, confirm, clearStatus, projectId };
}

function listCompositeIndexIds(projectId: string): readonly string[] {
  const output = execSync(
    `gcloud firestore indexes composite list --project=${projectId} --format='value(name)'`,
    { encoding: "utf8", shell: "/bin/bash" },
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function deleteCompositeIndex(
  projectId: string,
  indexId: string,
): void {
  execSync(
    `gcloud firestore indexes composite delete ${indexId} --project=${projectId} --database='(default)' --quiet`,
    { encoding: "utf8", stdio: "pipe", shell: "/bin/bash" },
  );
}

async function clearIndexStatusCollection(projectId: string): Promise<number> {
  initializeFirebaseAdmin({
    projectId,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: process.env.GCP_STORAGE_BUCKET,
  });

  const db = getFirestoreAdmin({ projectId });
  const collection = db.collection(INDEX_STATUS_COLLECTION);
  let deleted = 0;

  while (true) {
    const snapshot = await collection.limit(500).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function main(): Promise<void> {
  const { dryRun, confirm, clearStatus, projectId } = parseArgs(
    process.argv.slice(2),
  );

  if (!dryRun && !confirm) {
    throw new Error(
      "Pass --confirm to delete indexes, or --dry-run to preview. Refusing to run without an explicit flag.",
    );
  }

  const indexIds = listCompositeIndexIds(projectId);
  console.log(
    `Project ${projectId}: found ${indexIds.length} composite index(es).`,
  );

  if (dryRun) {
    for (const indexId of indexIds) {
      console.log(`  would delete: ${indexId}`);
    }
    if (clearStatus) {
      console.log(`  would clear collection: ${INDEX_STATUS_COLLECTION}`);
    }
    return;
  }

  let deletedIndexes = 0;
  for (const indexId of indexIds) {
    try {
      deleteCompositeIndex(projectId, indexId);
      deletedIndexes += 1;
      console.log(`Deleted composite index ${indexId} (${deletedIndexes}/${indexIds.length})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete ${indexId}: ${message}`);
    }
  }

  console.log(`Deleted ${deletedIndexes}/${indexIds.length} composite index(es).`);

  if (clearStatus) {
    const deletedStatus = await clearIndexStatusCollection(projectId);
    console.log(
      `Cleared ${deletedStatus} document(s) from ${INDEX_STATUS_COLLECTION}.`,
    );
  }

  console.log(
    "Done. Re-save entity models after deploy to provision the curated index set.",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
