import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { getAuth } from "firebase-admin/auth";

import { apiEnv } from "../../config/env.js";
import {
  RATES_LOCAL_IMPORT_OWNER_EMAIL,
  RATES_LOCAL_IMPORT_TENANT_ROLE,
} from "./constants.js";
import { replaySeedPaymentScheduleHooks } from "./seed-replay-payment-schedule-hooks.js";
import {
  createRatesRecordSeedContext,
  ensureRatesRecord,
  snapshotRatesSeedRecord,
} from "./seed-record-helpers.js";

const LOCAL_IMPORT_DIR = join(process.cwd(), ".local/tenant-import");

const LOCAL_IMPORT_SPECS = [
  { fileName: "category.json", entityName: "category" },
  { fileName: "actor.json", entityName: "actor" },
  { fileName: "account.json", entityName: "account" },
  { fileName: "financialItem.json", entityName: "financialItem" },
  { fileName: "loanDetails.json", entityName: "loanDetails" },
  { fileName: "loanMonthlyCost.json", entityName: "loanMonthlyCost" },
  { fileName: "loanUtilization.json", entityName: "loanUtilization" },
  { fileName: "incomeDetails.json", entityName: "incomeDetails" },
  { fileName: "investmentDetails.json", entityName: "investmentDetails" },
  { fileName: "serviceDetails.json", entityName: "serviceDetails" },
] as const;

type LocalImportSpec = (typeof LOCAL_IMPORT_SPECS)[number];

function isAuthUserNotFound(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return code === "auth/user-not-found";
}

export function resolveLocalTenantImportOwnerEmail(): string {
  const fromEnv = apiEnv.PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .find((email) => email.length > 0);

  return fromEnv ?? RATES_LOCAL_IMPORT_OWNER_EMAIL;
}

export function listPresentLocalImportSpecs(
  importDir: string = LOCAL_IMPORT_DIR,
): LocalImportSpec[] {
  return LOCAL_IMPORT_SPECS.filter((spec) =>
    existsSync(join(importDir, spec.fileName)),
  );
}

function readImportRecords(filePath: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}.`);
  }

  return parsed.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Invalid record at index ${index} in ${filePath}.`);
    }

    const record = row as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new Error(`Missing id at index ${index} in ${filePath}.`);
    }

    return record;
  });
}

async function ensureLocalImportOwnerAccess(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  email: string,
): Promise<string | null> {
  initializeFirebaseAdmin(firebaseAdminConfig);
  const auth = getAuth();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch (error: unknown) {
    if (isAuthUserNotFound(error)) {
      console.log(
        `[seed] Skipping local tenant import: Auth user not found for ${email}. ` +
          "Sign in once in the emulator, then re-run pnpm seed:database.",
      );
      return null;
    }
    throw error;
  }

  const userRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const authUserRecord = await getFirebaseUserRecord(uid, firebaseAdminConfig);
  await userRepository.upsertFromAuthUser(
    mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
  );

  const existing = await userRepository.getByUid(uid);
  const tenants = {
    ...(existing?.tenants ?? {}),
    [tenantId]: [RATES_LOCAL_IMPORT_TENANT_ROLE],
  };

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(
      `Failed to assign ${RATES_LOCAL_IMPORT_TENANT_ROLE} to ${email} on ${tenantId}.`,
    );
  }

  await setFirebaseUserCustomClaims(uid, { tenantId }, firebaseAdminConfig);
  return uid;
}

export async function seedLocalTenantImportIfPresent(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  importDir: string = LOCAL_IMPORT_DIR,
): Promise<{ readonly seeded: boolean; readonly ownerEmail: string | null }> {
  const presentSpecs = listPresentLocalImportSpecs(importDir);
  if (presentSpecs.length === 0) {
    console.log(
      `[seed] No local tenant import JSON in ${importDir}; skipping personal import.`,
    );
    return { seeded: false, ownerEmail: null };
  }

  const ownerEmail = resolveLocalTenantImportOwnerEmail();
  const ownerId = await ensureLocalImportOwnerAccess(
    tenantId,
    firebaseAdminConfig,
    ownerEmail,
  );
  if (!ownerId) {
    return { seeded: false, ownerEmail };
  }

  const context = createRatesRecordSeedContext(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );

  console.log(
    `[seed] Importing ${presentSpecs.length} local JSON file(s) for ${ownerEmail} from ${importDir}...`,
  );

  const loanDetails: Array<{
    id: string;
    financialItemId: string;
    record: Record<string, unknown>;
  }> = [];
  const financialItemIds: string[] = [];
  const financialItemRecords = new Map<string, Record<string, unknown>>();

  for (const spec of presentSpecs) {
    const filePath = join(importDir, spec.fileName);
    const records = readImportRecords(filePath);

    for (const record of records) {
      const { id, ...business } = record;
      const recordId = id as string;
      await ensureRatesRecord(context, spec.entityName, recordId, business);

      if (spec.entityName === "financialItem") {
        financialItemIds.push(recordId);
        financialItemRecords.set(
          recordId,
          snapshotRatesSeedRecord(
            context,
            spec.entityName,
            recordId,
            business,
          ),
        );
      }
      if (spec.entityName === "loanDetails") {
        const financialItemId = business.financialItemId;
        if (typeof financialItemId === "string" && financialItemId.length > 0) {
          loanDetails.push({
            id: recordId,
            financialItemId,
            record: snapshotRatesSeedRecord(
              context,
              spec.entityName,
              recordId,
              business,
            ),
          });
        }
      }
    }

    console.log(
      `[seed]   ${spec.fileName}: ${records.length} ${spec.entityName} record(s)`,
    );
  }

  await replaySeedPaymentScheduleHooks(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
    {
      loanDetails,
      financialItemIds,
      financialItemRecords,
    },
  );

  console.log(`[seed] Local tenant import complete for ${ownerEmail}.`);
  return { seeded: true, ownerEmail };
}
