import { pathToFileURL } from "node:url";

import {
  upsertAiRecordContext,
  upsertAiRecordNarrative,
  upsertAiRecordRag,
  type AiRecordSummaryRepository,
} from "@repo/ai-context";
import {
  getAllEntities,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import {
  registerDynamicEntity,
  resolveEntity as resolveDynamicEntity,
} from "@repo/dynamic-entities";
import { createEntityConverter } from "@repo/firestore-converters";
import {
  createFirestoreAdminAiRecordSummaryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityRepository,
  initializeFirebaseAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

/**
 * Legacy inline AI summary field names that this backfill migrates into
 * `ai_record_summaries` docs. All are string fields on the business record.
 */
const LEGACY_AI_FIELDS = [
  "aiSummaryJson",
  "aiShortSummaryJson",
  "aiSummaryText",
  "aiSummaryTextSourceHash",
  "aiSummaryHash",
  "aiSummaryEmbedding",
] as const;

export interface RecordSummaryBackfillPorts {
  readonly listEntityNames: (tenantId: string) => Promise<readonly string[]>;
  readonly listRecords: (
    tenantId: string,
    entityName: string,
    cursor?: string,
  ) => Promise<{
    readonly items: readonly Record<string, unknown>[];
    readonly nextCursor?: string | null;
  }>;
  readonly updateRecord: (
    tenantId: string,
    entityName: string,
    recordId: string,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  readonly aiRecordSummaryRepository: AiRecordSummaryRepository;
}

export interface RecordSummaryBackfillOptions {
  readonly tenantId: string;
  readonly entityName?: string;
}

function parseInlineContext(record: Record<string, unknown>): {
  readonly context: Readonly<Record<string, unknown>>;
} | null {
  const raw = record.aiSummaryJson;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { context: parsed as Record<string, unknown> };
    }
    return { context: { value: parsed } };
  } catch {
    return { context: { raw } };
  }
}

function stringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

async function migrateRecord(
  options: RecordSummaryBackfillOptions,
  ports: RecordSummaryBackfillPorts,
  entityName: string,
  record: Record<string, unknown>,
): Promise<boolean> {
  const recordId = typeof record.id === "string" ? record.id : "";
  if (!recordId) return false;

  const hasAnyLegacy = LEGACY_AI_FIELDS.some((key) => key in record);
  if (!hasAnyLegacy) return false;

  const parsed = parseInlineContext(record);
  const ownerId = stringField(record, "ownerId");
  const tenantWideRead =
    typeof record.tenantWideRead === "boolean" ? record.tenantWideRead : undefined;
  const accessUserIds = Array.isArray(record.accessUserIds)
    ? (record.accessUserIds.filter((value): value is string =>
        typeof value === "string" && value.trim().length > 0,
      ) as readonly string[])
    : undefined;

  if (parsed) {
    const ragText = stringField(record, "aiShortSummaryJson");
    await upsertAiRecordContext(ports.aiRecordSummaryRepository, {
      tenantId: options.tenantId,
      entityName,
      recordId,
      context: parsed.context,
      ...(ownerId ? { ownerId } : {}),
      ...(accessUserIds ? { accessUserIds } : {}),
      ...(tenantWideRead !== undefined ? { tenantWideRead } : {}),
      ...(ragText !== undefined ? { ragText } : {}),
    });
  } else {
    const ragText = stringField(record, "aiShortSummaryJson");
    if (ragText !== undefined) {
      await upsertAiRecordRag(ports.aiRecordSummaryRepository, {
        tenantId: options.tenantId,
        entityName,
        recordId,
        text: ragText,
        ...(ownerId ? { ownerId } : {}),
        ...(accessUserIds ? { accessUserIds } : {}),
        ...(tenantWideRead !== undefined ? { tenantWideRead } : {}),
      });
    }
  }

  const narrativeText = stringField(record, "aiSummaryText");
  if (narrativeText !== undefined) {
    const existing = await ports.aiRecordSummaryRepository.get(
      options.tenantId,
      entityName,
      recordId,
    );
    const sourceHash =
      stringField(record, "aiSummaryTextSourceHash") ??
      existing?.contextHash ??
      existing?.rag?.hash;
    if (sourceHash) {
      await upsertAiRecordNarrative(ports.aiRecordSummaryRepository, {
        tenantId: options.tenantId,
        entityName,
        recordId,
        variant: "default",
        text: narrativeText,
        sourceHash,
      });
    }
  }

  const removals: Record<string, unknown> = {};
  for (const key of LEGACY_AI_FIELDS) {
    if (key in record) removals[key] = null;
  }
  if (Object.keys(removals).length > 0) {
    await ports.updateRecord(options.tenantId, entityName, recordId, removals);
  }
  return true;
}

export async function backfillRecordSummaries(
  options: RecordSummaryBackfillOptions,
  ports: RecordSummaryBackfillPorts,
): Promise<{ readonly scanned: number; readonly migrated: number }> {
  const entityNames = options.entityName
    ? [options.entityName]
    : await ports.listEntityNames(options.tenantId);
  let scanned = 0;
  let migrated = 0;

  for (const entityName of entityNames) {
    let cursor: string | undefined;
    do {
      const page = await ports.listRecords(
        options.tenantId,
        entityName,
        cursor,
      );
      for (const record of page.items) {
        scanned += 1;
        const didMigrate = await migrateRecord(
          options,
          ports,
          entityName,
          record,
        );
        if (didMigrate) migrated += 1;
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  }

  return { scanned, migrated };
}

export function parseBackfillArgs(
  argv: readonly string[],
): RecordSummaryBackfillOptions {
  let tenantId: string | undefined;
  let entityName: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tenantId" || arg === "--entityName") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }
      if (arg === "--tenantId") {
        tenantId = value;
      } else {
        entityName = value;
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!tenantId) {
    throw new Error(
      "Usage: tsx scripts/ai/backfill-record-summaries.ts --tenantId <id> [--entityName <name>]",
    );
  }
  return { tenantId, ...(entityName ? { entityName } : {}) };
}

function resolveFirebaseAdminConfig(): FirebaseAdminConfig {
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "GCP_PROJECT_ID is required (docker-dev sets this for the Firestore emulator).",
    );
  }
  return {
    projectId,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: process.env.GCP_STORAGE_BUCKET,
  };
}

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

async function createLocalEmulatorPorts(): Promise<RecordSummaryBackfillPorts> {
  if (!process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is required. Run against the local emulator (e.g. after pnpm dev:docker:reset).",
    );
  }

  const firebaseAdminConfig = resolveFirebaseAdminConfig();
  initializeFirebaseAdmin(firebaseAdminConfig);

  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const aiRecordSummaryRepository =
    createFirestoreAdminAiRecordSummaryRepository(firebaseAdminConfig);
  const repositoryCache = new Map<
    string,
    ReturnType<typeof createFirestoreAdminEntityRepository<GenericRecord>>
  >();
  const loadedTenants = new Set<string>();

  async function ensureTenantEntitiesLoaded(tenantId: string): Promise<void> {
    if (loadedTenants.has(tenantId)) return;
    const records = await entityDefinitionRepository.list(tenantId);
    for (const record of records) {
      registerDynamicEntity(tenantId, record);
    }
    loadedTenants.add(tenantId);
  }

  function resolveEntity(
    name: string,
    tenantId: string,
  ): AnyDefinedEntity | undefined {
    const dynamic = resolveDynamicEntity(name, tenantId);
    if (dynamic) return dynamic;
    for (const entity of getAllEntities()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }

  function getRepository(tenantId: string, entityName: string) {
    const cacheKey = `${tenantId}:${entityName}`;
    const cached = repositoryCache.get(cacheKey);
    if (cached) return cached;
    const entity = resolveEntity(entityName, tenantId);
    if (!entity) return undefined;
    const repository = createFirestoreAdminEntityRepository({
      config: firebaseAdminConfig,
      collection: entity.metadata.collection,
      converter: createEntityConverter(entity),
    });
    repositoryCache.set(cacheKey, repository);
    return repository;
  }

  return {
    async listEntityNames(tenantId) {
      await ensureTenantEntitiesLoaded(tenantId);
      const definitions = await entityDefinitionRepository.list(tenantId);
      return definitions.map((definition) => definition.name);
    },
    async listRecords(tenantId, entityName, cursor) {
      await ensureTenantEntitiesLoaded(tenantId);
      const repository = getRepository(tenantId, entityName);
      if (!repository) {
        return { items: [], nextCursor: null };
      }
      const page = await repository.findAll({
        tenantId,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      return {
        items: page.items as readonly Record<string, unknown>[],
        nextCursor: page.nextCursor,
      };
    },
    async updateRecord(tenantId, entityName, recordId, fields) {
      await ensureTenantEntitiesLoaded(tenantId);
      const repository = getRepository(tenantId, entityName);
      if (!repository) {
        throw new Error(`No repository for entity "${entityName}".`);
      }
      const updated = await repository.update(recordId, tenantId, fields);
      if (!updated) {
        throw new Error(
          `Failed to update ${entityName}/${recordId}: record not found.`,
        );
      }
    },
    aiRecordSummaryRepository,
  };
}

async function runCli(): Promise<void> {
  const options = parseBackfillArgs(process.argv.slice(2));
  const ports = await createLocalEmulatorPorts();
  const result = await backfillRecordSummaries(options, ports);
  console.log(
    `Backfill complete: scanned=${result.scanned} migrated=${result.migrated}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
