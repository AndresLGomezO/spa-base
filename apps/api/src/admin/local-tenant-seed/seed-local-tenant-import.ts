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
  loadLocalTenantConfig,
  type LocalTenantConfig,
} from "./load-tenant-config.js";
import {
  createLocalRecordSeedContext,
  deleteLocalRecordsMatching,
  deleteLocalRecordsNotInSet,
  importLocalRecordsBatch,
} from "./seed-record-helpers.js";

const LOCAL_IMPORT_DIR = resolveTenantImportDir();

function defaultTenantConfig(): LocalTenantConfig {
  return loadLocalTenantConfig();
}

const LOCAL_EMAIL_MATCH_BINDINGS_DIR = "email-match-bindings";

interface LocalImportSpec {
  readonly dirName: string;
  readonly entityName: string;
}

function listEntitySubdirNames(parentDir: string): string[] {
  if (!existsSync(parentDir)) {
    return [];
  }
  return readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

/** Discover `records/{entity}` (or `generated/{entity}`) dirs that contain JSON. */
function discoverEntityImportSpecs(
  importDir: string,
  kind: "records" | "generated",
): LocalImportSpec[] {
  const root = join(importDir, kind);
  return listEntitySubdirNames(root)
    .map((entityName) => ({
      dirName: `${kind}/${entityName}`,
      entityName,
    }))
    .filter(
      (spec) => listJsonFilesInDir(join(importDir, spec.dirName)).length > 0,
    );
}

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
  options: {
    readonly recordIds?: ReadonlySet<string>;
    readonly dropExisting?: boolean;
  } = {},
): Promise<number> {
  const { recordIds, dropExisting = false } = options;
  const allBindings = readEmailMatchBindingsDir(importDir);
  if (allBindings.length === 0 && !dropExisting) {
    return 0;
  }

  const portableBindings =
    recordIds && recordIds.size > 0
      ? allBindings.filter((binding) => recordIds.has(binding.recordId))
      : allBindings;

  if (
    recordIds &&
    recordIds.size > 0 &&
    portableBindings.length === 0 &&
    !dropExisting
  ) {
    console.warn(
      `[seed] No email match bindings matched --ids filter (${[...recordIds].join(", ")}).`,
    );
    return 0;
  }

  const repository =
    createFirestoreAdminEmailMatchBindingRepository(firebaseAdminConfig);
  const existing = await repository.listForUser(tenantId, ownerId);

  if (dropExisting) {
    const toDelete =
      recordIds && recordIds.size > 0
        ? existing.filter((binding) => recordIds.has(binding.recordId))
        : existing;
    let deleted = 0;
    for (const binding of toDelete) {
      const didDelete = await repository.delete(tenantId, binding.id, ownerId);
      if (didDelete) {
        deleted += 1;
      }
    }
    console.log(
      `[seed] Dropped ${deleted} email match binding(s)${
        recordIds && recordIds.size > 0
          ? ` for record id(s) ${[...recordIds].join(", ")}`
          : ""
      }.`,
    );
  }

  if (portableBindings.length === 0) {
    return 0;
  }

  const remaining = dropExisting
    ? []
    : await repository.listForUser(tenantId, ownerId);
  const existingByKey = new Map(
    remaining.map((binding) => [bindingSeedKey(binding), binding] as const),
  );
  const existingById = new Map(
    remaining.map((binding) => [binding.id, binding] as const),
  );

  let upserted = 0;
  for (const portable of portableBindings) {
    const key = bindingSeedKey(portable);
    const stableId = portable.id?.trim() || undefined;
    const matchById = stableId ? existingById.get(stableId) : undefined;
    const matchByKey = existingByKey.get(key);
    const patchInput = {
      name: portable.name ?? null,
      description: portable.description ?? null,
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

    if (matchById) {
      await repository.patch(tenantId, matchById.id, ownerId, {
        ...patchInput,
        catchupNeeded: true,
      });
    } else if (matchByKey && (!stableId || matchByKey.id === stableId)) {
      await repository.patch(tenantId, matchByKey.id, ownerId, {
        ...patchInput,
        // Re-seed must re-list full history for updated rules (skipped_no_match retries).
        catchupNeeded: true,
      });
    } else {
      if (matchByKey && stableId && matchByKey.id !== stableId) {
        await repository.delete(tenantId, matchByKey.id, ownerId);
        existingByKey.delete(key);
        existingById.delete(matchByKey.id);
      }
      const created = await repository.create(tenantId, ownerId, {
        ...(stableId ? { id: stableId } : {}),
        entityName: portable.entityName,
        recordId: portable.recordId,
        ...patchInput,
      });
      existingByKey.set(key, created);
      existingById.set(created.id, created);
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
>(specs: readonly T[], entityNames: readonly string[] | undefined): T[] {
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
  /** Skip orphan deletes for generated entities (default false for full seed). */
  readonly skipOrphanDelete?: boolean;
  /** Run schedule/payment mock generator (default true for full seed). */
  readonly runMockGenerator?: boolean;
  /** Upsert email-match-bindings/*.json (default true for full seed). */
  readonly includeEmailMatchBindings?: boolean;
  /** Upload logos/images from local files (default true). */
  readonly includeEntityImages?: boolean;
  /**
   * Delete existing rows for selected entities / email bindings before upsert.
   * With `recordIds`, only those ids (or bindings for those recordIds) are dropped.
   */
  readonly dropExisting?: boolean;
}

function isAuthUserNotFound(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return code === "auth/user-not-found";
}

export function resolveLocalTenantImportOwnerEmail(
  config: LocalTenantConfig = defaultTenantConfig(),
): string {
  const fromEnv = apiEnv.PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .find((email) => email.length > 0);

  return fromEnv ?? config.localImportOwnerEmail;
}

export function listPresentLocalImportSpecs(
  importDir: string = LOCAL_IMPORT_DIR,
): LocalImportSpec[] {
  return discoverEntityImportSpecs(importDir, "records");
}

export function listPresentLocalGeneratedImportSpecs(
  importDir: string = LOCAL_IMPORT_DIR,
): LocalImportSpec[] {
  return discoverEntityImportSpecs(importDir, "generated");
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
 * One JSON array per `generated/{entity}/{groupKey}.json` file;
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

const ENTITY_IMAGE_FIELD_CANDIDATES = ["logo", "image"] as const;

interface EntityImageSeedSpec {
  readonly entityName: string;
  readonly dirName: string;
  readonly fieldName: string;
}

function resolveConfiguredImageField(
  entityName: string,
  config: LocalTenantConfig = defaultTenantConfig(),
): string | null {
  const configured = config.recordImageFields[entityName];
  return typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : null;
}

function discoverImageFieldFromRecords(
  records: readonly Record<string, unknown>[],
): string | null {
  for (const fieldName of ENTITY_IMAGE_FIELD_CANDIDATES) {
    if (records.some((record) => readEntityImageFileName(record, fieldName))) {
      return fieldName;
    }
  }
  return null;
}

function listEntityImageSeedSpecs(
  importDir: string,
  config: LocalTenantConfig = defaultTenantConfig(),
): EntityImageSeedSpec[] {
  const specs: EntityImageSeedSpec[] = [];
  for (const entityName of listEntitySubdirNames(join(importDir, "records"))) {
    const dirName = `records/${entityName}`;
    const records = readImportRecordsDir(join(importDir, dirName));
    if (records.length === 0) {
      continue;
    }
    const fieldName =
      resolveConfiguredImageField(entityName, config) ??
      discoverImageFieldFromRecords(records);
    if (!fieldName) {
      continue;
    }
    specs.push({ entityName, dirName, fieldName });
  }
  return specs;
}

function entityImageFieldName(
  entityName: string,
  imageSpecs: readonly EntityImageSeedSpec[],
): string | null {
  return (
    imageSpecs.find((spec) => spec.entityName === entityName)?.fieldName ?? null
  );
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

function buildRelatedImageFileNameById(
  importDir: string,
  sourceEntity: string,
  sourceField: string,
): ReadonlyMap<string, string> {
  const sourceDir = join(importDir, `records/${sourceEntity}`);
  if (!existsSync(sourceDir)) {
    return new Map();
  }

  const byId = new Map<string, string>();
  for (const record of readImportRecordsDir(sourceDir)) {
    const objectId = record.id;
    if (typeof objectId !== "string" || objectId.trim().length === 0) {
      continue;
    }

    const fileName = readEntityImageFileName(record, sourceField);
    if (fileName) {
      byId.set(objectId, fileName);
    }
  }

  return byId;
}

export function enrichRecordsWithRelatedEntityImages(
  records: readonly Record<string, unknown>[],
  options: {
    readonly entityName: string;
    readonly targetField: string;
    readonly relationField: string;
    readonly relatedFileNameById: ReadonlyMap<string, string>;
  },
): Record<string, unknown>[] {
  return records.map((record) => {
    if (readEntityImageFileName(record, options.targetField)) {
      return record;
    }

    const relatedId = record[options.relationField];
    if (typeof relatedId !== "string" || relatedId.trim().length === 0) {
      return record;
    }

    const fileName = options.relatedFileNameById.get(relatedId);
    if (!fileName) {
      return record;
    }

    return {
      ...record,
      [options.targetField]: buildEntityImageFileRef(
        options.entityName,
        fileName,
      ),
    };
  });
}

function resolveEntityImageSeedRecords(
  importDir: string,
  spec: EntityImageSeedSpec,
  config: LocalTenantConfig = defaultTenantConfig(),
): Record<string, unknown>[] {
  const entityDir = join(importDir, spec.dirName);
  if (!existsSync(entityDir)) {
    return [];
  }

  let records = readImportRecordsDir(entityDir);
  for (const rule of config.recordImageInheritance) {
    if (rule.entityName !== spec.entityName) {
      continue;
    }
    records = enrichRecordsWithRelatedEntityImages(records, {
      entityName: rule.entityName,
      targetField: rule.targetField,
      relationField: rule.relationField,
      relatedFileNameById: buildRelatedImageFileNameById(
        importDir,
        rule.sourceEntity,
        rule.sourceField,
      ),
    });
  }
  return records;
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
  imageSpecs: readonly EntityImageSeedSpec[],
): Record<string, unknown> {
  const uploaded = uploadedImages.get(uploadedEntityImageKey(entityName, id));
  if (!uploaded) {
    return business;
  }

  const fieldName = entityImageFieldName(entityName, imageSpecs);
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
  imageSpecs: readonly EntityImageSeedSpec[],
  config: LocalTenantConfig = defaultTenantConfig(),
): Promise<UploadedEntityImages> {
  const logosDir = join(importDir, "logos");
  const uploadedImages = new Map<string, EntityFileReference>();
  if (!existsSync(logosDir)) {
    return uploadedImages;
  }

  for (const spec of imageSpecs) {
    const records = resolveEntityImageSeedRecords(importDir, spec, config);
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
      writeGeneratedRecordsGrouped(
        join(importDir, "generated"),
        payload as Readonly<Record<string, readonly Record<string, unknown>[]>>,
      );
    }

    const counts = Object.entries(payload as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => `${(value as unknown[]).length} ${key}`)
      .join(", ");
    console.log(
      `[tenant-import] Generated schedule payment mocks in ${join(importDir, "generated")} ` +
        `(${counts}, anchor ${anchorDate}).`,
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

  const config = defaultTenantConfig();
  const existing = await userRepository.getByUid(uid);
  const tenants = {
    ...(existing?.tenants ?? {}),
    [tenantId]: [config.localImportTenantRole],
  };

  const updated = await userRepository.updateAccess(uid, { tenants });
  if (!updated) {
    throw new Error(
      `Failed to assign ${config.localImportTenantRole} to ${email} on ${tenantId}.`,
    );
  }

  await setFirebaseUserCustomClaims(uid, { tenantId }, firebaseAdminConfig);
  return uid;
}

export async function verifyGcpImportOwner(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  email: string = resolveLocalTenantImportOwnerEmail(),
  expectedUid: string = defaultTenantConfig().gcpDemoOwnerUid,
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

function inferGeneratedGroupField(
  rows: readonly Record<string, unknown>[],
  entityName: string,
): string {
  if (rows.length === 0) {
    return "id";
  }
  const sample = rows[0]!;
  for (const key of Object.keys(sample)) {
    if (key === "id" || !key.endsWith("Id")) {
      continue;
    }
    if (
      rows.every(
        (row) =>
          typeof row[key] === "string" && String(row[key]).trim().length > 0,
      )
    ) {
      return key;
    }
  }
  throw new Error(
    `Could not infer group-by *Id field for generated ${entityName} rows.`,
  );
}

function writeGeneratedRecordsGrouped(
  outputDir: string,
  payload: Readonly<Record<string, readonly Record<string, unknown>[]>>,
): void {
  for (const [entityName, rows] of Object.entries(payload)) {
    if (!Array.isArray(rows)) {
      continue;
    }
    const entityDir = join(outputDir, entityName);
    if (existsSync(entityDir)) {
      rmSync(entityDir, { recursive: true, force: true });
    }
    mkdirSync(entityDir, { recursive: true });

    const groupField = inferGeneratedGroupField(rows, entityName);
    const byGroup = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const groupId = row[groupField];
      if (typeof groupId !== "string" || groupId.trim().length === 0) {
        throw new Error(
          `Missing ${groupField} on generated ${entityName} row.`,
        );
      }
      const list = byGroup.get(groupId) ?? [];
      list.push(row);
      byGroup.set(groupId, list);
    }

    for (const [groupId, groupRows] of byGroup) {
      writeFileSync(
        join(entityDir, `${groupId}.json`),
        `${JSON.stringify(groupRows, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

async function importLocalRecords(
  context: ReturnType<typeof createLocalRecordSeedContext>,
  importDir: string,
  specs: readonly LocalImportSpec[],
  uploadedImages: UploadedEntityImages = new Map(),
  imageSpecs: readonly EntityImageSeedSpec[] = [],
  options: {
    readonly recordIds?: ReadonlySet<string>;
    readonly skipOrphanDelete?: boolean;
    readonly generated?: boolean;
    readonly dropExisting?: boolean;
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
      records.length === 0 &&
      !options.dropExisting
    ) {
      console.warn(
        `[seed]   ${spec.dirName}: 0 ${spec.entityName} record(s) matched --ids filter.`,
      );
      continue;
    }

    if (options.dropExisting) {
      const deleted = await deleteLocalRecordsMatching(
        context,
        spec.entityName,
        options.recordIds && options.recordIds.size > 0
          ? options.recordIds
          : undefined,
      );
      if (deleted > 0) {
        console.log(
          `[seed]   Dropped ${deleted} existing ${spec.entityName} record(s).`,
        );
      }
    }

    if (records.length === 0) {
      continue;
    }

    if (
      !options.dropExisting &&
      !options.skipOrphanDelete &&
      options.generated
    ) {
      const keepIds = new Set(
        records
          .map((record) =>
            typeof record.id === "string" ? record.id.trim() : "",
          )
          .filter((id) => id.length > 0),
      );
      const deleted = await deleteLocalRecordsNotInSet(
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

    await importLocalRecordsBatch(
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
            imageSpecs,
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
  const dropExisting = importOptions.dropExisting ?? false;

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
    wantsGenerated && (runMockGenerator || presentGeneratedSpecs.length > 0);
  const hasBindingWork =
    includeEmailMatchBindings &&
    (dropExisting ||
      listJsonFilesInDir(join(importDir, LOCAL_EMAIL_MATCH_BINDINGS_DIR))
        .length > 0);

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

  const context = createLocalRecordSeedContext(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );

  const importRecordOptions = {
    recordIds: importOptions.recordIds,
    skipOrphanDelete,
    dropExisting,
  };

  if (hasStructuralWork) {
    console.log(
      `[seed] Importing ${presentSpecs.length} local record dir(s) for ${ownerEmail} from ${importDir}...`,
    );

    const imageSpecs = includeEntityImages
      ? listEntityImageSeedSpecs(importDir)
      : [];
    const uploadedImages =
      imageSpecs.length > 0
        ? await uploadEntityImagesFromLocalFiles(
            tenantId,
            firebaseAdminConfig,
            importDir,
            imageSpecs,
          )
        : new Map();
    await importLocalRecords(
      context,
      importDir,
      presentSpecs,
      uploadedImages,
      imageSpecs,
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
      [],
      {
        ...importRecordOptions,
        generated: true,
      },
    );
  }

  if (includeEmailMatchBindings) {
    const bindingsUpserted = await seedLocalEmailMatchBindingsIfPresent(
      tenantId,
      firebaseAdminConfig,
      ownerId,
      importDir,
      {
        recordIds: importOptions.recordIds,
        dropExisting,
      },
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
