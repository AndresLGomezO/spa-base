import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import type { EntityFileReference } from "@repo/entities";
import {
  createFirestoreAdminEmailMatchBindingRepository,
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  initializeFirebaseAdmin,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  uploadEntityFile,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { parseEmailMatchBindingsJson } from "@repo/gmail-ingest";
import { getAuth } from "firebase-admin/auth";

import { apiEnv } from "../../config/env.js";
import {
  RATES_GCP_DEMO_OWNER_UID,
  RATES_LOCAL_IMPORT_OWNER_EMAIL,
  RATES_LOCAL_IMPORT_TENANT_ROLE,
} from "./constants.js";
import {
  createRatesRecordSeedContext,
  deleteRatesRecordsNotInSet,
  importRatesRecordsBatch,
} from "./seed-record-helpers.js";

const LOCAL_IMPORT_DIR =
  process.env.TENANT_IMPORT_DIR?.trim() ||
  join(process.cwd(), ".local/tenant-import");

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

const LOCAL_GENERATED_IMPORT_SPECS = [
  {
    fileName: "generated/paymentSchedule.json",
    entityName: "paymentSchedule",
  },
  { fileName: "generated/transaction.json", entityName: "transaction" },
  {
    fileName: "generated/balanceSnapshot.json",
    entityName: "balanceSnapshot",
  },
] as const;

const LOCAL_EMAIL_MATCH_BINDINGS_FILE = "emailMatchBindings.json";

type LocalImportSpec = (typeof LOCAL_IMPORT_SPECS)[number];
type LocalGeneratedImportSpec = (typeof LOCAL_GENERATED_IMPORT_SPECS)[number];

function fromAddressesKey(addresses: readonly string[]): string {
  return [...addresses]
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
}

function patternsKey(patterns: readonly string[] | undefined): string {
  return [...(patterns ?? [])]
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

function bindingSeedKey(binding: {
  readonly entityName: string;
  readonly recordId: string;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly useAi?: boolean;
}): string {
  return [
    binding.entityName,
    binding.recordId,
    fromAddressesKey(binding.fromAddresses ?? []),
    patternsKey(binding.subjectPatterns),
    patternsKey(binding.bodyPatterns),
    binding.useAi === true ? "ai" : "manual",
  ].join("\0");
}

async function seedLocalEmailMatchBindingsIfPresent(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  ownerId: string,
  importDir: string,
): Promise<number> {
  const filePath = join(importDir, LOCAL_EMAIL_MATCH_BINDINGS_FILE);
  if (!existsSync(filePath)) {
    return 0;
  }

  const parsed = parseEmailMatchBindingsJson(readFileSync(filePath, "utf8"));
  if (!parsed.ok) {
    const detail = parsed.errors
      .map((error) => `${error.path}: ${error.message}`)
      .join("; ");
    throw new Error(
      `Invalid ${LOCAL_EMAIL_MATCH_BINDINGS_FILE} in ${importDir}: ${detail}`,
    );
  }

  const repository =
    createFirestoreAdminEmailMatchBindingRepository(firebaseAdminConfig);
  const existing = await repository.listForUser(tenantId, ownerId);
  const existingByKey = new Map(
    existing.map((binding) => [bindingSeedKey(binding), binding] as const),
  );

  let upserted = 0;
  for (const portable of parsed.data) {
    const key = bindingSeedKey(portable);
    const match = existingByKey.get(key);
    const patchInput = {
      enabled: portable.enabled ?? true,
      fromAddresses: portable.fromAddresses ?? [],
      subjectPatterns: portable.subjectPatterns ?? [],
      bodyPatterns: portable.bodyPatterns ?? [],
      gmailQueryExtra: portable.gmailQueryExtra ?? null,
      useAi: portable.useAi ?? false,
      aiInstructions: portable.aiInstructions ?? null,
      bodyFieldExtractors: portable.bodyFieldExtractors ?? [],
    };

    if (match) {
      await repository.patch(tenantId, match.id, ownerId, patchInput);
    } else {
      await repository.create(tenantId, ownerId, {
        entityName: portable.entityName,
        recordId: portable.recordId,
        ...patchInput,
      });
    }
    upserted += 1;
  }

  return upserted;
}
export interface LocalTenantImportOptions {
  readonly requireOwner?: boolean;
  readonly expectedUid?: string;
}

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

export function listPresentLocalGeneratedImportSpecs(
  importDir: string = LOCAL_IMPORT_DIR,
): LocalGeneratedImportSpec[] {
  return LOCAL_GENERATED_IMPORT_SPECS.filter((spec) =>
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

export function normalizeLocalImportRecord(
  tenantId: string,
  record: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(record).replaceAll("TENANT_ID", tenantId),
  ) as Record<string, unknown>;
}

export function resolveEntityImageContentType(fileName: string): string | null {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return null;
}

export function readEntityImageFileName(
  record: Record<string, unknown>,
  fieldName: string,
): string | null {
  const fileRef = record[fieldName];
  if (!fileRef || typeof fileRef !== "object" || Array.isArray(fileRef)) {
    return null;
  }

  const fileName = (fileRef as EntityFileReference).fileName;
  return typeof fileName === "string" && fileName.trim().length > 0
    ? fileName.trim()
    : null;
}

const LOCAL_ENTITY_IMAGE_SEED_SPECS = [
  {
    entityName: "actor",
    jsonFile: "actor.json",
    fieldName: "logo",
  },
  {
    entityName: "category",
    jsonFile: "category.json",
    fieldName: "image",
  },
  {
    entityName: "financialItem",
    jsonFile: "financialItem.json",
    fieldName: "image",
  },
] as const;

function entityImageFieldName(entityName: string): string | null {
  switch (entityName) {
    case "actor":
      return "logo";
    case "category":
    case "financialItem":
      return "image";
    default:
      return null;
  }
}

function buildEntityImageFileRef(
  entityName: string,
  fileName: string,
): EntityFileReference {
  const contentType = resolveEntityImageContentType(fileName) ?? "image/png";
  return {
    storagePath: `tenants/TENANT_ID/entity-files/${entityName}/${fileName}`,
    contentType,
    fileName,
  };
}

function buildActorLogoFileNameById(
  importDir: string,
): ReadonlyMap<string, string> {
  const actorPath = join(importDir, "actor.json");
  if (!existsSync(actorPath)) {
    return new Map();
  }

  const actorLogoById = new Map<string, string>();
  for (const record of readImportRecords(actorPath)) {
    const objectId = record.id;
    if (typeof objectId !== "string" || objectId.trim().length === 0) {
      continue;
    }

    const fileName = readEntityImageFileName(record, "logo");
    if (fileName) {
      actorLogoById.set(objectId, fileName);
    }
  }

  return actorLogoById;
}

export function enrichFinancialItemRecordsWithActorLogos(
  records: readonly Record<string, unknown>[],
  actorLogoById: ReadonlyMap<string, string>,
): Record<string, unknown>[] {
  return records.map((record) => {
    if (readEntityImageFileName(record, "image")) {
      return record;
    }

    const actorId = record.actorId;
    if (typeof actorId !== "string" || actorId.trim().length === 0) {
      return record;
    }

    const fileName = actorLogoById.get(actorId);
    if (!fileName) {
      return record;
    }

    return {
      ...record,
      image: buildEntityImageFileRef("financialItem", fileName),
    };
  });
}

function resolveEntityImageSeedRecords(
  importDir: string,
  spec: (typeof LOCAL_ENTITY_IMAGE_SEED_SPECS)[number],
): Record<string, unknown>[] {
  const entityPath = join(importDir, spec.jsonFile);
  if (!existsSync(entityPath)) {
    return [];
  }

  const records = readImportRecords(entityPath);
  if (spec.entityName !== "financialItem") {
    return records;
  }

  return enrichFinancialItemRecordsWithActorLogos(
    records,
    buildActorLogoFileNameById(importDir),
  );
}

const ENTITY_IMAGE_UPLOAD_CONCURRENCY = 8;

type UploadedEntityImages = ReadonlyMap<string, EntityFileReference>;

function uploadedEntityImageKey(entityName: string, objectId: string): string {
  return `${entityName}:${objectId}`;
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]!, index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function applyUploadedEntityImage(
  entityName: string,
  id: string,
  business: Record<string, unknown>,
  uploadedImages: UploadedEntityImages,
): Record<string, unknown> {
  const uploaded = uploadedImages.get(uploadedEntityImageKey(entityName, id));
  if (!uploaded) {
    return business;
  }

  const fieldName = entityImageFieldName(entityName);
  if (!fieldName) {
    return business;
  }

  return {
    ...business,
    [fieldName]: uploaded,
  };
}

async function uploadEntityImagesFromLocalFiles(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  importDir: string,
): Promise<UploadedEntityImages> {
  const logosDir = join(importDir, "logos");
  const uploadedImages = new Map<string, EntityFileReference>();
  if (!existsSync(logosDir)) {
    return uploadedImages;
  }

  for (const spec of LOCAL_ENTITY_IMAGE_SEED_SPECS) {
    const records = resolveEntityImageSeedRecords(importDir, spec);
    if (records.length === 0) {
      continue;
    }

    const uploadTargets = records.flatMap((record) => {
      const objectId = record.id;
      if (typeof objectId !== "string" || objectId.trim().length === 0) {
        return [];
      }

      const fileName = readEntityImageFileName(record, spec.fieldName);
      if (!fileName) {
        return [];
      }

      const localImagePath = join(logosDir, fileName);
      if (!existsSync(localImagePath)) {
        console.log(
          `[seed]   ${spec.entityName} ${spec.fieldName} file missing for ${record.name ?? objectId}: ${fileName}`,
        );
        return [];
      }

      const contentType = resolveEntityImageContentType(fileName);
      if (!contentType) {
        console.log(
          `[seed]   unsupported ${spec.entityName} ${spec.fieldName} type for ${record.name ?? objectId}: ${fileName}`,
        );
        return [];
      }

      return [
        {
          objectId,
          fileName,
          localImagePath,
          contentType,
          label: String(record.name ?? objectId),
        },
      ];
    });

    if (uploadTargets.length === 0) {
      continue;
    }

    const startedAt = Date.now();
    await runWithConcurrency(
      uploadTargets,
      ENTITY_IMAGE_UPLOAD_CONCURRENCY,
      async (target) => {
        const file = await uploadEntityFile({
          config: firebaseAdminConfig,
          tenantId,
          entityName: spec.entityName,
          fieldName: spec.fieldName,
          fieldType: "image",
          objectId: target.objectId,
          buffer: readFileSync(target.localImagePath),
          contentType: target.contentType,
          fileName: target.fileName,
          uploadedBy: "seed-database",
        });

        uploadedImages.set(
          uploadedEntityImageKey(spec.entityName, target.objectId),
          file,
        );
      },
    );

    console.log(
      `[seed]   ${spec.entityName} ${spec.fieldName}: ${uploadTargets.length} uploaded from ${logosDir} (${Date.now() - startedAt}ms)`,
    );
  }

  return uploadedImages;
}

async function runLocalSchedulePaymentMockGenerator(
  importDir: string,
): Promise<void> {
  const scriptPath = join(importDir, "generate-schedule-payment-mocks.ts");
  if (!existsSync(scriptPath)) {
    console.log(
      `[seed] No local schedule generator at ${scriptPath}; skipping generated import.`,
    );
    return;
  }

  console.log(`[seed] Running local schedule payment generator...`);
  const previousImportDir = process.env.TENANT_IMPORT_DIR;
  process.env.TENANT_IMPORT_DIR = importDir;

  try {
    const generator = await import(pathToFileURL(scriptPath).href);
    const snapshot = generator.loadImportSnapshot();
    const anchorDate = generator.toDateOnly(new Date());
    const payload = await generator.generateLocalSchedulePaymentMocks(
      snapshot,
      anchorDate,
    );

    const outputDir = join(importDir, "generated");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "paymentSchedule.json"),
      `${JSON.stringify(payload.paymentSchedule, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      join(outputDir, "transaction.json"),
      `${JSON.stringify(payload.transaction, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      join(outputDir, "balanceSnapshot.json"),
      `${JSON.stringify(payload.balanceSnapshot, null, 2)}\n`,
      "utf8",
    );

    console.log(
      `[tenant-import] Generated schedule payment mocks in ${outputDir} ` +
        `(${payload.paymentSchedule.length} schedules, ${payload.transaction.length} transactions, ${payload.balanceSnapshot.length} snapshots, anchor ${anchorDate}).`,
    );
  } finally {
    if (previousImportDir === undefined) {
      delete process.env.TENANT_IMPORT_DIR;
    } else {
      process.env.TENANT_IMPORT_DIR = previousImportDir;
    }
  }
}

async function ensureLocalImportOwnerAccess(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  email: string,
  options: LocalTenantImportOptions = {},
): Promise<string | null> {
  initializeFirebaseAdmin(firebaseAdminConfig);
  const auth = getAuth();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch (error: unknown) {
    if (isAuthUserNotFound(error)) {
      if (options.requireOwner) {
        throw new Error(
          `GCP seed requires Firebase Auth user for ${email}, but the user was not found.`,
        );
      }
      console.log(
        `[seed] Skipping local tenant import: Auth user not found for ${email}. ` +
          "Sign in once in the emulator, then re-run pnpm seed:database.",
      );
      return null;
    }
    throw error;
  }

  if (options.expectedUid && uid !== options.expectedUid) {
    throw new Error(
      `Firebase Auth UID mismatch for ${email}: expected ${options.expectedUid}, got ${uid}.`,
    );
  }

  if (options.requireOwner) {
    console.log(`[seed] GCP owner verified: ${email} → ${uid}`);
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

export async function verifyGcpImportOwner(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  email: string = resolveLocalTenantImportOwnerEmail(),
  expectedUid: string = RATES_GCP_DEMO_OWNER_UID,
): Promise<string> {
  const ownerId = await ensureLocalImportOwnerAccess(
    tenantId,
    firebaseAdminConfig,
    email,
    { requireOwner: true, expectedUid },
  );
  if (!ownerId) {
    throw new Error(`GCP import owner verification failed for ${email}.`);
  }
  return ownerId;
}

async function importLocalRecords(
  context: ReturnType<typeof createRatesRecordSeedContext>,
  importDir: string,
  specs: readonly { readonly fileName: string; readonly entityName: string }[],
  uploadedImages: UploadedEntityImages = new Map(),
): Promise<void> {
  for (const spec of specs) {
    const filePath = join(importDir, spec.fileName);
    const records = readImportRecords(filePath);
    const startedAt = Date.now();

    if (
      spec.entityName === "paymentSchedule" ||
      spec.entityName === "transaction"
    ) {
      const keepIds = new Set(
        records
          .map((record) =>
            typeof record.id === "string" ? record.id.trim() : "",
          )
          .filter((id) => id.length > 0),
      );
      const deleted = await deleteRatesRecordsNotInSet(
        context,
        spec.entityName,
        keepIds,
      );
      if (deleted > 0) {
        console.log(
          `[seed]   Removed ${deleted} orphan ${spec.entityName} record(s) not in ${spec.fileName}.`,
        );
      }
    }

    await importRatesRecordsBatch(
      context,
      spec.entityName,
      records.map((record) => {
        const normalized = normalizeLocalImportRecord(context.tenantId, record);
        const { id, ...business } = normalized;
        return {
          id: id as string,
          business: applyUploadedEntityImage(
            spec.entityName,
            id as string,
            business,
            uploadedImages,
          ),
        };
      }),
    );

    console.log(
      `[seed]   ${spec.fileName}: ${records.length} ${spec.entityName} record(s) (${Date.now() - startedAt}ms)`,
    );
  }
}

export async function seedLocalTenantImportIfPresent(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  importDir: string = LOCAL_IMPORT_DIR,
  importOptions: LocalTenantImportOptions = {},
): Promise<{ readonly seeded: boolean; readonly ownerEmail: string | null }> {
  const presentSpecs = listPresentLocalImportSpecs(importDir);
  if (presentSpecs.length === 0) {
    if (importOptions.requireOwner) {
      throw new Error(
        `GCP seed requires local import JSON in ${importDir}, but no supported files were found.`,
      );
    }
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
    importOptions,
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

  const uploadedImages = await uploadEntityImagesFromLocalFiles(
    tenantId,
    firebaseAdminConfig,
    importDir,
  );
  await importLocalRecords(context, importDir, presentSpecs, uploadedImages);
  await runLocalSchedulePaymentMockGenerator(importDir);

  const generatedSpecs = listPresentLocalGeneratedImportSpecs(importDir);
  if (generatedSpecs.length > 0) {
    console.log(
      `[seed] Importing ${generatedSpecs.length} generated local JSON file(s)...`,
    );
    await importLocalRecords(context, importDir, generatedSpecs);
  }

  const bindingsUpserted = await seedLocalEmailMatchBindingsIfPresent(
    tenantId,
    firebaseAdminConfig,
    ownerId,
    importDir,
  );
  if (bindingsUpserted > 0) {
    console.log(
      `[seed] Upserted ${bindingsUpserted} email match binding(s) from ${LOCAL_EMAIL_MATCH_BINDINGS_FILE}.`,
    );
  }

  console.log(`[seed] Local tenant import complete for ${ownerEmail}.`);
  return { seeded: true, ownerEmail };
}
