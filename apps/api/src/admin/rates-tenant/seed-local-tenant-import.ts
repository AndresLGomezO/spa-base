import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
import {
  parseEmailMatchBindingJson,
  type PortableEmailMatchBinding,
} from "@repo/gmail-ingest";
import { getAuth } from "firebase-admin/auth";

import { apiEnv } from "../../config/env.js";
import { resolveTenantImportDir } from "../../scripts/resolve-tenant-import-dir.js";
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

const LOCAL_IMPORT_DIR = resolveTenantImportDir();

const LOCAL_IMPORT_SPECS = [
  { dirName: "records/category", entityName: "category" },
  { dirName: "records/actor", entityName: "actor" },
  { dirName: "records/account", entityName: "account" },
  { dirName: "records/financialItem", entityName: "financialItem" },
  { dirName: "records/loanDetails", entityName: "loanDetails" },
  { dirName: "records/loanMonthlyCost", entityName: "loanMonthlyCost" },
  { dirName: "records/loanUtilization", entityName: "loanUtilization" },
  { dirName: "records/incomeDetails", entityName: "incomeDetails" },
  { dirName: "records/investmentDetails", entityName: "investmentDetails" },
  { dirName: "records/serviceDetails", entityName: "serviceDetails" },
] as const;

const LOCAL_GENERATED_IMPORT_SPECS = [
  {
    dirName: "generated/paymentSchedule",
    entityName: "paymentSchedule",
  },
  { dirName: "generated/transaction", entityName: "transaction" },
  {
    dirName: "generated/balanceSnapshot",
    entityName: "balanceSnapshot",
  },
] as const;

const LOCAL_EMAIL_MATCH_BINDINGS_DIR = "email-match-bindings";

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

function listJsonFilesInDir(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }
  return readdirSync(dirPath)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b));
}

function readEmailMatchBindingsDir(
  importDir: string,
): PortableEmailMatchBinding[] {
  const dirPath = join(importDir, LOCAL_EMAIL_MATCH_BINDINGS_DIR);
  const files = listJsonFilesInDir(dirPath);
  if (files.length === 0) {
    return [];
  }

  return files.map((fileName) => {
    const filePath = join(dirPath, fileName);
    const parsed = parseEmailMatchBindingJson(readFileSync(filePath, "utf8"));
    if (!parsed.ok) {
      const detail = parsed.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join("; ");
      throw new Error(`Invalid email match binding ${filePath}: ${detail}`);
    }
    return parsed.data;
  });
}

async function seedLocalEmailMatchBindingsIfPresent(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  ownerId: string,
  importDir: string,
  recordIds?: ReadonlySet<string>,
): Promise<number> {
  const allBindings = readEmailMatchBindingsDir(importDir);
  if (allBindings.length === 0) {
    return 0;
  }

  const portableBindings =
    recordIds && recordIds.size > 0
      ? allBindings.filter((binding) => recordIds.has(binding.recordId))
      : allBindings;

  if (recordIds && recordIds.size > 0 && portableBindings.length === 0) {
    console.warn(
      `[seed] No email match bindings matched --ids filter (${[...recordIds].join(", ")}).`,
    );
    return 0;
  }

  const repository =
    createFirestoreAdminEmailMatchBindingRepository(firebaseAdminConfig);
  const existing = await repository.listForUser(tenantId, ownerId);
  const existingByKey = new Map(
    existing.map((binding) => [bindingSeedKey(binding), binding] as const),
  );

  let upserted = 0;
  for (const portable of portableBindings) {
    const key = bindingSeedKey(portable);
    const match = existingByKey.get(key);
    const patchInput = {
      enabled: portable.enabled ?? true,
      order: portable.order ?? 100,
      ingestMode: portable.ingestMode ?? "create",
      fromAddresses: portable.fromAddresses ?? [],
      subjectPatterns: portable.subjectPatterns ?? [],
      bodyPatterns: portable.bodyPatterns ?? [],
      gmailQueryExtra: portable.gmailQueryExtra ?? null,
      useAi: portable.useAi ?? false,
      aiInstructions: portable.aiInstructions ?? null,
      bodyFieldExtractors: portable.bodyFieldExtractors ?? [],
      attachmentImport: portable.attachmentImport ?? null,
    };

    if (match) {
      await repository.patch(tenantId, match.id, ownerId, {
        ...patchInput,
        // Re-seed must re-list full history for updated rules (skipped_no_match retries).
        catchupNeeded: true,
      });
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

export function filterImportRecordsByIds(
  records: readonly Record<string, unknown>[],
  recordIds: ReadonlySet<string> | undefined,
): Record<string, unknown>[] {
  if (!recordIds || recordIds.size === 0) {
    return [...records];
  }
  return records.filter(
    (record) =>
      typeof record.id === "string" && recordIds.has(record.id.trim()),
  );
}

export function filterImportSpecsByEntityNames<
  T extends { readonly entityName: string },
>(
  specs: readonly T[],
  entityNames: readonly string[] | undefined,
): T[] {
  if (entityNames === undefined) {
    return [...specs];
  }
  const allowed = new Set(entityNames);
  return specs.filter((spec) => allowed.has(spec.entityName));
}
export interface LocalTenantImportOptions {
  readonly requireOwner?: boolean;
  readonly expectedUid?: string;
  /** When set, only import these structural entity names. */
  readonly entityNames?: readonly string[];
  /** When set, only import these generated entity names. */
  readonly generatedEntityNames?: readonly string[];
  /** When set, only upsert rows / bindings whose id/recordId is in the set. */
  readonly recordIds?: ReadonlySet<string>;
  /** Skip orphan paymentSchedule/transaction deletes (default false for full seed). */
  readonly skipOrphanDelete?: boolean;
  /** Run schedule/payment mock generator (default true for full seed). */
  readonly runMockGenerator?: boolean;
  /** Upsert email-match-bindings/*.json (default true for full seed). */
  readonly includeEmailMatchBindings?: boolean;
  /** Upload logos/images from local files (default true). */
  readonly includeEntityImages?: boolean;
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
  return LOCAL_IMPORT_SPECS.filter(
    (spec) => listJsonFilesInDir(join(importDir, spec.dirName)).length > 0,
  );
}

export function listPresentLocalGeneratedImportSpecs(
  importDir: string = LOCAL_IMPORT_DIR,
): LocalGeneratedImportSpec[] {
  return LOCAL_GENERATED_IMPORT_SPECS.filter(
    (spec) => listJsonFilesInDir(join(importDir, spec.dirName)).length > 0,
  );
}

function assertRecordObject(
  row: unknown,
  source: string,
): Record<string, unknown> {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`Invalid record object in ${source}.`);
  }
  const record = row as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    throw new Error(`Missing id in ${source}.`);
  }
  return record;
}

/** One object per `records/{entity}/{id}.json` file. */
function readImportRecordsDir(dirPath: string): Record<string, unknown>[] {
  return listJsonFilesInDir(dirPath).map((fileName) => {
    const filePath = join(dirPath, fileName);
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    return assertRecordObject(parsed, filePath);
  });
}

/**
 * One JSON array per `generated/{entity}/{financialItemId}.json` file;
 * concatenate for import.
 */
function readGeneratedRecordsDir(dirPath: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const fileName of listJsonFilesInDir(dirPath)) {
    const filePath = join(dirPath, fileName);
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected JSON array in ${filePath}.`);
    }
    parsed.forEach((row, index) => {
      records.push(assertRecordObject(row, `${filePath}[${index}]`));
    });
  }
  return records;
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
    dirName: "records/actor",
    fieldName: "logo",
  },
  {
    entityName: "category",
    dirName: "records/category",
    fieldName: "image",
  },
  {
    entityName: "financialItem",
    dirName: "records/financialItem",
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
  const actorDir = join(importDir, "records/actor");
  if (!existsSync(actorDir)) {
    return new Map();
  }

  const actorLogoById = new Map<string, string>();
  for (const record of readImportRecordsDir(actorDir)) {
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
  const entityDir = join(importDir, spec.dirName);
  if (!existsSync(entityDir)) {
    return [];
  }

  const records = readImportRecordsDir(entityDir);
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

    if (typeof generator.writeGeneratedArtifacts === "function") {
      generator.writeGeneratedArtifacts(payload);
    } else {
      writeGeneratedRecordsByFinancialItem(
        join(importDir, "generated"),
        payload,
      );
    }

    console.log(
      `[tenant-import] Generated schedule payment mocks in ${join(importDir, "generated")} ` +
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

function writeGeneratedRecordsByFinancialItem(
  outputDir: string,
  payload: {
    readonly paymentSchedule: readonly Record<string, unknown>[];
    readonly transaction: readonly Record<string, unknown>[];
    readonly balanceSnapshot: readonly Record<string, unknown>[];
  },
): void {
  const groups: Array<{
    readonly entityName: string;
    readonly rows: readonly Record<string, unknown>[];
  }> = [
    { entityName: "paymentSchedule", rows: payload.paymentSchedule },
    { entityName: "transaction", rows: payload.transaction },
    { entityName: "balanceSnapshot", rows: payload.balanceSnapshot },
  ];

  for (const group of groups) {
    const entityDir = join(outputDir, group.entityName);
    if (existsSync(entityDir)) {
      rmSync(entityDir, { recursive: true, force: true });
    }
    mkdirSync(entityDir, { recursive: true });

    const byFi = new Map<string, Record<string, unknown>[]>();
    for (const row of group.rows) {
      const fiId = row.financialItemId;
      if (typeof fiId !== "string" || fiId.trim().length === 0) {
        throw new Error(
          `Missing financialItemId on generated ${group.entityName} row.`,
        );
      }
      const list = byFi.get(fiId) ?? [];
      list.push(row);
      byFi.set(fiId, list);
    }

    for (const [fiId, rows] of byFi) {
      writeFileSync(
        join(entityDir, `${fiId}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

async function importLocalRecords(
  context: ReturnType<typeof createRatesRecordSeedContext>,
  importDir: string,
  specs: readonly { readonly dirName: string; readonly entityName: string }[],
  uploadedImages: UploadedEntityImages = new Map(),
  options: {
    readonly recordIds?: ReadonlySet<string>;
    readonly skipOrphanDelete?: boolean;
    readonly generated?: boolean;
  } = {},
): Promise<void> {
  for (const spec of specs) {
    const dirPath = join(importDir, spec.dirName);
    const allRecords = options.generated
      ? readGeneratedRecordsDir(dirPath)
      : readImportRecordsDir(dirPath);
    const records = filterImportRecordsByIds(allRecords, options.recordIds);
    const startedAt = Date.now();

    if (
      options.recordIds &&
      options.recordIds.size > 0 &&
      records.length === 0
    ) {
      console.warn(
        `[seed]   ${spec.dirName}: 0 ${spec.entityName} record(s) matched --ids filter.`,
      );
      continue;
    }

    if (
      !options.skipOrphanDelete &&
      (spec.entityName === "paymentSchedule" ||
        spec.entityName === "transaction")
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
          `[seed]   Removed ${deleted} orphan ${spec.entityName} record(s) not in ${spec.dirName}.`,
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
      `[seed]   ${spec.dirName}: ${records.length} ${spec.entityName} record(s) (${Date.now() - startedAt}ms)`,
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
  const includeEmailMatchBindings =
    importOptions.includeEmailMatchBindings ?? true;
  const runMockGenerator = importOptions.runMockGenerator ?? true;
  const includeEntityImages = importOptions.includeEntityImages ?? true;
  const skipOrphanDelete = importOptions.skipOrphanDelete ?? false;

  const presentSpecs = filterImportSpecsByEntityNames(
    listPresentLocalImportSpecs(importDir),
    importOptions.entityNames,
  );
  const wantsGenerated =
    importOptions.generatedEntityNames === undefined ||
    importOptions.generatedEntityNames.length > 0 ||
    runMockGenerator;
  const presentGeneratedSpecs = filterImportSpecsByEntityNames(
    listPresentLocalGeneratedImportSpecs(importDir),
    importOptions.generatedEntityNames,
  );

  const hasStructuralWork = presentSpecs.length > 0;
  const hasGeneratedWork =
    wantsGenerated &&
    (runMockGenerator || presentGeneratedSpecs.length > 0);
  const hasBindingWork =
    includeEmailMatchBindings &&
    listJsonFilesInDir(join(importDir, LOCAL_EMAIL_MATCH_BINDINGS_DIR)).length >
      0;

  if (!hasStructuralWork && !hasGeneratedWork && !hasBindingWork) {
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

  const importRecordOptions = {
    recordIds: importOptions.recordIds,
    skipOrphanDelete,
  };

  if (hasStructuralWork) {
    console.log(
      `[seed] Importing ${presentSpecs.length} local record dir(s) for ${ownerEmail} from ${importDir}...`,
    );

    const uploadedImages = includeEntityImages
      ? await uploadEntityImagesFromLocalFiles(
          tenantId,
          firebaseAdminConfig,
          importDir,
        )
      : new Map();
    await importLocalRecords(
      context,
      importDir,
      presentSpecs,
      uploadedImages,
      importRecordOptions,
    );
  }

  if (runMockGenerator) {
    await runLocalSchedulePaymentMockGenerator(importDir);
  }

  const generatedSpecs = filterImportSpecsByEntityNames(
    listPresentLocalGeneratedImportSpecs(importDir),
    importOptions.generatedEntityNames,
  );
  if (generatedSpecs.length > 0) {
    console.log(
      `[seed] Importing ${generatedSpecs.length} generated local record dir(s)...`,
    );
    await importLocalRecords(
      context,
      importDir,
      generatedSpecs,
      new Map(),
      { ...importRecordOptions, generated: true },
    );
  }

  if (includeEmailMatchBindings) {
    const bindingsUpserted = await seedLocalEmailMatchBindingsIfPresent(
      tenantId,
      firebaseAdminConfig,
      ownerId,
      importDir,
      importOptions.recordIds,
    );
    if (bindingsUpserted > 0) {
      console.log(
        `[seed] Upserted ${bindingsUpserted} email match binding(s) from ${LOCAL_EMAIL_MATCH_BINDINGS_DIR}.`,
      );
    }
  }

  console.log(`[seed] Local tenant import complete for ${ownerEmail}.`);
  return { seeded: true, ownerEmail };
}
