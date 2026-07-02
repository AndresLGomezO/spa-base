import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeIndexSignature } from "@repo/firestore-indexes";

import {
  configureIndexProvisioningQueue,
  getIndexProvisioningQueueStateForTests,
  resetIndexProvisioningQueueForTests,
  scheduleEnsureFirestoreIndexes,
} from "./firestore-index-provisioner.js";

const sampleIndex = {
  collectionGroup: "accounts",
  queryScope: "COLLECTION" as const,
  fields: [
    { fieldPath: "tenantId", order: "ASCENDING" as const },
    { fieldPath: "id", order: "ASCENDING" as const },
  ],
};

vi.mock("@google-cloud/firestore", () => {
  class MockOperation {
    readonly name = "operations/test";
    promise = vi.fn(async () => ({}));
  }

  class MockFirestoreAdminClient {
    collectionGroupPath = vi.fn(
      () => "projects/demo/databases/(default)/collectionGroups/accounts",
    );
    createIndex = vi.fn(async () => [new MockOperation()]);
  }

  return {
    default: {
      v1: {
        FirestoreAdminClient: MockFirestoreAdminClient,
      },
    },
  };
});

describe("index provisioning queue", () => {
  beforeEach(() => {
    resetIndexProvisioningQueueForTests();
    configureIndexProvisioningQueue({ concurrency: 1, batchDelayMs: 0 });
  });

  it("deduplicates queued indexes by signature", async () => {
    scheduleEnsureFirestoreIndexes([sampleIndex, sampleIndex], {
      projectId: "demo",
    });
    scheduleEnsureFirestoreIndexes([sampleIndex], {
      projectId: "demo",
    });

    expect(getIndexProvisioningQueueStateForTests().pendingCount).toBe(1);

    await vi.waitFor(() => {
      expect(getIndexProvisioningQueueStateForTests().running).toBe(false);
      expect(getIndexProvisioningQueueStateForTests().pendingCount).toBe(0);
    });
  });

  it("skips indexes that are already READY in the status store", async () => {
    const upsertCreating = vi.fn(async () => ({}));
    const statusStore = {
      getBySignature: vi.fn(async () => ({
        signature: computeIndexSignature(sampleIndex),
        collection: "accounts",
        status: "READY",
        fields: sampleIndex.fields,
        updatedAt: new Date().toISOString(),
      })),
      upsertCreating,
    };

    scheduleEnsureFirestoreIndexes([sampleIndex], {
      projectId: "demo",
      statusStore: statusStore as never,
    });

    await vi.waitFor(() => {
      expect(getIndexProvisioningQueueStateForTests().pendingCount).toBe(0);
    });

    expect(upsertCreating).not.toHaveBeenCalled();
  });

  it("skips ERROR indexes unless forceRetry is set", async () => {
    const statusStore = {
      getBySignature: vi.fn(async () => ({
        signature: computeIndexSignature(sampleIndex),
        collection: "accounts",
        status: "ERROR",
        fields: sampleIndex.fields,
        updatedAt: new Date().toISOString(),
        errorMessage: "failed",
      })),
      upsertCreating: vi.fn(async () => ({})),
      markReady: vi.fn(async () => undefined),
    };

    scheduleEnsureFirestoreIndexes([sampleIndex], {
      projectId: "demo",
      statusStore: statusStore as never,
    });

    await vi.waitFor(() => {
      expect(getIndexProvisioningQueueStateForTests().pendingCount).toBe(0);
    });

    expect(statusStore.upsertCreating).not.toHaveBeenCalled();

    scheduleEnsureFirestoreIndexes([sampleIndex], {
      projectId: "demo",
      statusStore: statusStore as never,
      forceRetry: true,
    });

    await vi.waitFor(() => {
      expect(statusStore.upsertCreating).toHaveBeenCalled();
    });
  });
});
