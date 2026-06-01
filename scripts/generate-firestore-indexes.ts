/**
 * Regenerates composite indexes in firestore.indexes.json from the entity catalog.
 *
 * Usage:
 *   pnpm generate:firestore-indexes
 *   pnpm generate:firestore-indexes -- --dynamic-from-firestore --tenant-id tenant_dev_1
 *   pnpm generate:firestore-indexes -- --collections accounts,loans
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bootstrapPlatformApp } from "../apps/platform/bootstrap.js";
import { platformApp } from "../apps/platform/app.config.js";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import { clearEntityRegistry, getAllEntities } from "@repo/entities";
import {
  dedupeIndexes,
  indexesForEntities,
  type FirestoreCompositeIndex,
  type FirestoreIndexesFile,
} from "@repo/firestore-indexes";
import { createFirestoreAdminEntityDefinitionRepository } from "@repo/gcp-firebase";
import { initializeFirebaseAdmin } from "@repo/gcp-firebase/firebase-admin";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexesPath = resolve(repoRoot, "firestore.indexes.json");

function parseArgs(argv: readonly string[]): {
  dynamicFromFirestore: boolean;
  tenantIds: readonly string[];
  extraCollections: readonly string[];
} {
  const tenantIds: string[] = [];
  const extraCollections: string[] = [];
  let dynamicFromFirestore = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dynamic-from-firestore") {
      dynamicFromFirestore = true;
      continue;
    }
    if (arg === "--tenant-id" && argv[index + 1]) {
      tenantIds.push(argv[index + 1]!);
      index += 1;
      continue;
    }
    if (arg === "--collections" && argv[index + 1]) {
      extraCollections.push(
        ...argv[index + 1]!.split(",").map((value) => value.trim()).filter(Boolean),
      );
      index += 1;
    }
  }

  const envTenantIds =
    process.env.FIRESTORE_INDEX_TENANT_IDS?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  return {
    dynamicFromFirestore,
    tenantIds: tenantIds.length > 0 ? tenantIds : envTenantIds,
    extraCollections,
  };
}

function loadExistingFile(): FirestoreIndexesFile {
  const raw = readFileSync(indexesPath, "utf8");
  return JSON.parse(raw) as FirestoreIndexesFile;
}

function ownershipIndexesForCollections(
  collections: readonly string[],
): FirestoreCompositeIndex[] {
  return collections.map((collection) => ({
    collectionGroup: collection,
    queryScope: "COLLECTION" as const,
    fields: [
      { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" as const },
      { fieldPath: "id", order: "ASCENDING" as const },
    ],
  }));
}

async function loadDynamicEntities(
  tenantIds: readonly string[],
): Promise<ReturnType<typeof defineEntityFromRecord>[]> {
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "GCP_PROJECT_ID is required for --dynamic-from-firestore (or set FIRESTORE_INDEX_TENANT_IDS with a reachable project).",
    );
  }

  initializeFirebaseAdmin({
    projectId,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: process.env.GCP_STORAGE_BUCKET,
  });

  const repository = createFirestoreAdminEntityDefinitionRepository({
    projectId,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: process.env.GCP_STORAGE_BUCKET,
  });

  const entities = [];
  for (const tenantId of tenantIds) {
    const records = await repository.list(tenantId);
    for (const record of records) {
      entities.push(defineEntityFromRecord(record));
    }
  }
  return entities;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  clearEntityRegistry();
  bootstrapPlatformApp(platformApp);

  const entities = [...getAllEntities()];

  if (args.dynamicFromFirestore) {
    if (args.tenantIds.length === 0) {
      throw new Error(
        "Provide at least one --tenant-id (or FIRESTORE_INDEX_TENANT_IDS) when using --dynamic-from-firestore.",
      );
    }
    entities.push(...(await loadDynamicEntities(args.tenantIds)));
  }

  const generated = indexesForEntities(entities);
  const extra = ownershipIndexesForCollections(args.extraCollections);
  const existing = loadExistingFile();

  const output: FirestoreIndexesFile = {
    indexes: dedupeIndexes([...generated, ...extra]),
    ...(existing.fieldOverrides ? { fieldOverrides: existing.fieldOverrides } : {}),
  };

  writeFileSync(indexesPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${output.indexes.length} composite index(es) to ${indexesPath}`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
