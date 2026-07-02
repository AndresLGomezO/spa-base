import {
  summarizeIndexProvisioningStatus,
  type FirestoreIndexStatusStore,
  type IndexProvisioningPhase,
  type IndexProvisioningStatusSummary,
} from "@repo/gcp-firebase";
import { resolveEntityCollection } from "@repo/firestore-indexes";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";

interface TenantIndexProvisioningStatus {
  readonly phase: IndexProvisioningPhase;
  readonly isEnvironmentReady: boolean;
  readonly collections: readonly IndexProvisioningStatusSummary[];
  readonly buildingCollections: readonly string[];
  readonly errorCollections: readonly string[];
}

export async function summarizeTenantIndexProvisioningStatus(
  statusStore: FirestoreIndexStatusStore,
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): Promise<TenantIndexProvisioningStatus> {
  const entities = entityRuntime.getEntitiesForTenant(tenantId);
  const collectionNames = [
    ...new Set(entities.map((entity) => resolveEntityCollection(entity))),
  ];

  const collections = await Promise.all(
    collectionNames.map(async (collection) => {
      const records = await statusStore.listByCollection(collection);
      return summarizeIndexProvisioningStatus(collection, records);
    }),
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

  return {
    phase,
    isEnvironmentReady: phase !== "building",
    collections,
    buildingCollections,
    errorCollections,
  };
}
