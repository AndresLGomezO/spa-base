import { describe, expect, it } from "vitest";

import {
  computeIndexSignature,
  indexesForEntity,
} from "@repo/firestore-indexes";

import { summarizeTenantIndexProvisioningStatus } from "./tenant-index-status.js";

const accountsEntity = {
  metadata: {
    collection: "accounts",
    fields: {
      name: { type: "string", required: true },
    },
  },
  name: "accounts",
} as never;

const accountsIndex = indexesForEntity(accountsEntity)[0]!;
const accountsSignature = computeIndexSignature(accountsIndex);

function createStatusStore(recordsByCollection: Record<string, unknown[]>) {
  return {
    async listByCollection(collection: string) {
      return recordsByCollection[collection] ?? [];
    },
    async getBySignature(signature: string) {
      for (const records of Object.values(recordsByCollection)) {
        const match = (records as { signature: string }[]).find(
          (record) => record.signature === signature,
        );
        if (match) {
          return match;
        }
      }
      return null;
    },
  };
}

function createEntityRuntime(collections: readonly string[]) {
  return {
    getEntitiesForTenant: () =>
      collections.map((collection) => ({
        metadata: {
          collection,
          fields: {
            name: { type: "string", required: true },
          },
        },
        name: collection,
      })),
  } as never;
}

function createEventRepository(events: readonly unknown[]) {
  return {
    listRecentForTenant: async () => events,
  };
}

describe("summarizeTenantIndexProvisioningStatus", () => {
  it("reports building when any collection has CREATING indexes", async () => {
    const summary = await summarizeTenantIndexProvisioningStatus(
      createStatusStore({
        accounts: [
          {
            signature: "sig_a",
            collection: "accounts",
            status: "CREATING",
            fields: [],
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        actors: [
          {
            signature: "sig_b",
            collection: "actors",
            status: "READY",
            fields: [],
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }) as never,
      createEntityRuntime(["accounts", "actors"]),
      "tenant_a",
    );

    expect(summary.phase).toBe("building");
    expect(summary.isEnvironmentReady).toBe(false);
    expect(summary.buildingCollections).toEqual(["accounts"]);
  });

  it("reports ready environment when all tracked indexes are ready", async () => {
    const summary = await summarizeTenantIndexProvisioningStatus(
      createStatusStore({
        accounts: [
          {
            signature: "sig_a",
            collection: "accounts",
            status: "READY",
            fields: [],
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }) as never,
      createEntityRuntime(["accounts"]),
      "tenant_a",
    );

    expect(summary.phase).toBe("ready");
    expect(summary.isEnvironmentReady).toBe(true);
  });

  it("builds per-index jobs with nested logs from events and status", async () => {
    const summary = await summarizeTenantIndexProvisioningStatus(
      createStatusStore({
        accounts: [
          {
            signature: accountsSignature,
            collection: "accounts",
            status: "ERROR",
            fields: accountsIndex.fields,
            errorMessage: "Admin API failed",
            retryExhausted: true,
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
      }) as never,
      createEntityRuntime(["accounts"]),
      "tenant_a",
      createEventRepository([
        {
          id: "evt_1",
          timestamp: "2026-01-01T00:00:00.000Z",
          event: "ensure_requested",
          collection: "accounts",
          signature: accountsSignature,
        },
        {
          id: "evt_2",
          timestamp: "2026-01-01T00:00:01.000Z",
          event: "creating",
          collection: "accounts",
          signature: accountsSignature,
          operationName: "operations/123",
        },
        {
          id: "evt_3",
          timestamp: "2026-01-02T00:00:00.000Z",
          event: "error",
          collection: "accounts",
          signature: accountsSignature,
          errorMessage: "Admin API failed",
          retryExhausted: true,
        },
      ]) as never,
    );

    expect(summary.totalIndexes).toBeGreaterThan(0);
    expect(summary.errorCount).toBeGreaterThan(0);
    expect(summary.requiresManualActionCount).toBe(summary.errorCount);

    const failedJob = summary.indexes.find((job) => job.phase === "error");
    expect(failedJob?.requiresManualAction).toBe(true);
    expect(failedJob?.log.length).toBeGreaterThanOrEqual(3);
    expect(failedJob?.log.at(-1)?.detail).toBe("Admin API failed");
  });
});
