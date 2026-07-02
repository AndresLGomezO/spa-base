import { describe, expect, it } from "vitest";

import { summarizeTenantIndexProvisioningStatus } from "./tenant-index-status.js";

function createStatusStore(recordsByCollection: Record<string, unknown[]>) {
  return {
    async listByCollection(collection: string) {
      return recordsByCollection[collection] ?? [];
    },
  };
}

function createEntityRuntime(collections: readonly string[]) {
  return {
    getEntitiesForTenant: () =>
      collections.map((collection) => ({
        metadata: { collection },
      })),
  } as never;
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
});
