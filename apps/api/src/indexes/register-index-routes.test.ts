import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildOwnershipListIndex,
  computeIndexSignature,
} from "@repo/firestore-indexes";
import * as gcpFirebase from "@repo/gcp-firebase";

import { registerIndexRoutes } from "./register-index-routes.js";

const sampleIndex = buildOwnershipListIndex("accounts");

describe("registerIndexRoutes manual retry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("clears failed signatures and re-enqueues with forceRetry", async () => {
    const ensureFirestoreIndexes = vi
      .spyOn(gcpFirebase, "ensureFirestoreIndexes")
      .mockResolvedValue(undefined);
    const clearErrorForRetry = vi.fn(async () => undefined);
    const getFailedRecords = vi.fn(async () => [
      {
        signature: computeIndexSignature(sampleIndex),
        collection: "accounts",
        status: "ERROR",
        fields: sampleIndex.fields,
        updatedAt: new Date().toISOString(),
      },
    ]);
    const statusStore = {
      clearErrorForRetry,
      getFailedRecords,
      listByCollection: vi.fn(async () => []),
      getBySignature: vi.fn(async () => null),
    };

    const entityRuntime = {
      getEntitiesForTenant: () => [],
    };

    const app = Fastify();
    app.addHook("preHandler", async (request) => {
      request.ctx = {
        tenantId: "tenant_a",
        userId: "user_1",
        permissions: [],
      } as never;
    });

    await registerIndexRoutes(app, {
      authenticate: async () => undefined,
      firebaseAdminConfig: { projectId: "demo" },
      entityRuntime: entityRuntime as never,
      statusStore: statusStore as never,
      ensureFirestoreIndexes: true,
      publishToPubSub: false,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/indexes/provision",
      payload: {
        collection: "accounts",
        retryFailed: true,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(clearErrorForRetry).toHaveBeenCalledWith(
      computeIndexSignature(sampleIndex),
    );
    expect(ensureFirestoreIndexes).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        forceRetry: true,
        provisionTrigger: "manual_retry_failed",
      }),
    );
  });
});
