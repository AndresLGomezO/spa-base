import type {
  IndexProvisionEventRecord,
  IndexProvisionEventType,
} from "@repo/debug-logs";
import {
  computeIndexSignature,
  dedupeIndexes,
  indexesForEntity,
  resolveEntityCollection,
  type FirestoreCompositeIndex,
} from "@repo/firestore-indexes";
import type { IndexProvisionEventRepository } from "@repo/firestore-converters";
import {
  summarizeIndexProvisioningStatus,
  type FirestoreIndexStatusStore,
  type IndexProvisioningPhase,
  type IndexProvisioningStatusSummary,
  type IndexStatusRecord,
} from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";

type IndexProvisioningJobPhase = "pending" | "creating" | "ready" | "error";

type IndexProvisioningLogLevel = "info" | "success" | "warning" | "error";

interface IndexProvisioningLogEntry {
  readonly timestamp: string;
  readonly level: IndexProvisioningLogLevel;
  readonly event: IndexProvisionEventType;
  readonly message: string;
  readonly detail?: string;
}

interface IndexProvisioningJob {
  readonly signature: string;
  readonly collection: string;
  readonly phase: IndexProvisioningJobPhase;
  readonly requiresManualAction: boolean;
  readonly errorMessage?: string;
  readonly fields?: FirestoreCompositeIndex["fields"];
  readonly log: readonly IndexProvisioningLogEntry[];
}

interface TenantIndexProvisioningStatus {
  readonly phase: IndexProvisioningPhase;
  readonly isEnvironmentReady: boolean;
  readonly collections: readonly IndexProvisioningStatusSummary[];
  readonly buildingCollections: readonly string[];
  readonly errorCollections: readonly string[];
  readonly totalIndexes: number;
  readonly creatingCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
  readonly requiresManualActionCount: number;
  readonly indexes: readonly IndexProvisioningJob[];
}

function statusRecordToJobPhase(
  record: IndexStatusRecord | undefined,
): IndexProvisioningJobPhase {
  if (!record) {
    return "pending";
  }
  switch (record.status) {
    case "CREATING":
      return "creating";
    case "READY":
      return "ready";
    case "ERROR":
      return "error";
    default:
      return "pending";
  }
}

function eventToLogLevel(
  event: IndexProvisionEventType,
): IndexProvisioningLogLevel {
  switch (event) {
    case "ready":
      return "success";
    case "error":
      return "error";
    case "operation_blocked":
      return "warning";
    default:
      return "info";
  }
}

function eventToMessage(event: IndexProvisionEventRecord): string {
  switch (event.event) {
    case "ensure_requested":
      return "Index ensure requested";
    case "creating":
      return "Firestore Admin createIndex started";
    case "ready":
      return "Index is ready";
    case "error":
      return event.retryExhausted
        ? "Index provisioning failed (manual action required)"
        : "Index provisioning failed";
    case "operation_blocked":
      return `Operation blocked: ${event.blockedOperation ?? "unknown"}`;
    default:
      return event.event;
  }
}

function buildLogEntry(
  event: IndexProvisionEventRecord,
): IndexProvisioningLogEntry {
  return {
    timestamp: event.timestamp,
    level: eventToLogLevel(event.event),
    event: event.event,
    message: eventToMessage(event),
    ...(event.errorMessage ? { detail: event.errorMessage } : {}),
    ...(event.operationName && !event.errorMessage
      ? { detail: event.operationName }
      : {}),
  };
}

function buildJobLog(
  signature: string,
  events: readonly IndexProvisionEventRecord[],
  record: IndexStatusRecord | undefined,
): readonly IndexProvisioningLogEntry[] {
  const signatureEvents = events
    .filter((event) => event.signature === signature)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  const log = signatureEvents.map((event) => buildLogEntry(event));

  if (
    record?.status === "ERROR" &&
    record.errorMessage &&
    !log.some(
      (entry) =>
        entry.event === "error" && entry.detail === record.errorMessage,
    )
  ) {
    return [
      ...log,
      {
        timestamp: record.updatedAt,
        level: "error" as const,
        event: "error" as const,
        message: record.retryExhausted
          ? "Index provisioning failed (manual action required)"
          : "Index provisioning failed",
        detail: record.errorMessage,
      },
    ];
  }

  return log;
}

function buildIndexJob(
  index: FirestoreCompositeIndex,
  recordsBySignature: ReadonlyMap<string, IndexStatusRecord>,
  events: readonly IndexProvisionEventRecord[],
): IndexProvisioningJob {
  const signature = computeIndexSignature(index);
  const record = recordsBySignature.get(signature);
  const phase = statusRecordToJobPhase(record);

  return {
    signature,
    collection: index.collectionGroup,
    phase,
    requiresManualAction: phase === "error",
    ...(record?.errorMessage ? { errorMessage: record.errorMessage } : {}),
    fields: index.fields,
    log: buildJobLog(signature, events, record),
  };
}

export async function summarizeTenantIndexProvisioningStatus(
  statusStore: FirestoreIndexStatusStore,
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  eventRepository?: IndexProvisionEventRepository,
): Promise<TenantIndexProvisioningStatus> {
  const entities = entityRuntime.getEntitiesForTenant(tenantId);
  const collectionNames = [
    ...new Set(entities.map((entity) => resolveEntityCollection(entity))),
  ];
  const desiredIndexes = dedupeIndexes(
    entities.flatMap((entity) => indexesForEntity(entity)),
  );

  const collections = await Promise.all(
    collectionNames.map(async (collection) => {
      const records = await statusStore.listByCollection(collection);
      return summarizeIndexProvisioningStatus(collection, records);
    }),
  );

  const recordsBySignature = new Map<string, IndexStatusRecord>();
  for (const summary of collections) {
    for (const record of summary.records) {
      recordsBySignature.set(record.signature, record);
    }
  }

  const events =
    eventRepository && collectionNames.length > 0
      ? await eventRepository.listRecentForTenant(tenantId, collectionNames, {
          limit: 2_000,
        })
      : [];

  const indexes = desiredIndexes.map((index) =>
    buildIndexJob(index, recordsBySignature, events),
  );

  const buildingCollections = collections
    .filter((summary) => summary.phase === "building")
    .map((summary) => summary.collection);
  const errorCollections = collections
    .filter((summary) => summary.phase === "error")
    .map((summary) => summary.collection);

  let phase: IndexProvisioningPhase = "idle";
  if (buildingCollections.length > 0) {
    phase = "building";
  } else if (errorCollections.length > 0) {
    phase = "error";
  } else if (
    collections.some(
      (summary) => summary.phase === "ready" || summary.records.length > 0,
    )
  ) {
    phase = "ready";
  }

  const creatingCount = indexes.filter(
    (job) => job.phase === "creating",
  ).length;
  const readyCount = indexes.filter((job) => job.phase === "ready").length;
  const errorCount = indexes.filter((job) => job.phase === "error").length;

  return {
    phase,
    isEnvironmentReady: phase !== "building",
    collections,
    buildingCollections,
    errorCollections,
    totalIndexes: indexes.length,
    creatingCount,
    readyCount,
    errorCount,
    requiresManualActionCount: errorCount,
    indexes,
  };
}
