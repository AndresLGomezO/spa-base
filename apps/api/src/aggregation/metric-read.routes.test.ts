import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMetricDocId } from "@repo/metrics-engine";
import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";

import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import { buildServer } from "../server.js";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "demo@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: authState.uid,
    email: "demo@example.com",
    emailVerified: true,
    displayName: "Demo User",
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
  })),
  mapFirebaseUserRecordToAuthUserProjection: vi.fn((user) => ({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    providerData: user.providerData,
    metadata: user.metadata,
  })),
  createFirestoreAdminRegisteredUserRepository: vi.fn(),
  createFirestoreAdminPlatformRoleRepository: vi.fn(),
  createFirestoreAdminTenantRepository: vi.fn(),
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminHookRepository: vi.fn(),
  publishAggregationEventMessage: vi.fn(),
}));

const metricDefinitionRepository = createInMemoryMetricDefinitionRepository();
const aggregationEventRepository = createInMemoryAggregationEventRepository();
const metricValueRepository = createInMemoryMetricValueRepository();
const backfillJobRepository = createInMemoryBackfillJobRepository();
const metricContributionRepository =
  createInMemoryMetricContributionRepository();

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    metricDefinitionRepository,
    aggregationEventRepository,
    metricValueRepository,
    backfillJobRepository,
    metricContributionRepository,
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

describe("metric read routes", () => {
  let metricDefinitionId = "";

  beforeEach(async () => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    metricDefinitionRepository.store.clear();
    metricValueRepository.store.clear();

    const created = await metricDefinitionRepository.create(
      authState.tenantId,
      {
        name: "Spend by category",
        sourceModel: "transaction",
        filters: [],
        groupBy: ["month"],
        dimensions: ["categoryId"],
        dateFieldGranularity: {},
        valueDisplayFormat: "number",
        aggregations: [{ field: "amount", operation: "SUM" }],
        schemaVersionDependency: 1,
        fieldsDependency: ["amount", "month", "categoryId"],
        status: "ACTIVE",
        version: 1,
      },
    );
    metricDefinitionId = created.id;
  });

  it("returns a metric row by deterministic key", async () => {
    const server = await buildTestServer();
    const definition = (await metricDefinitionRepository.getById(
      authState.tenantId,
      metricDefinitionId,
    ))!;
    const group = { month: "2026-06" };
    const dimensions = { categoryId: "food" };
    const docId = buildMetricDocId(authState.uid, group, dimensions);

    await metricValueRepository.applyIncrements(
      authState.tenantId,
      definition.target.collection,
      docId,
      {
        userId: authState.uid,
        group,
        dimensions,
        increments: { sum_amount: 400 },
      },
    );

    const response = await server.inject({
      method: "POST",
      url: `/api/metrics/${metricDefinitionId}/row`,
      headers: authHeaders,
      payload: { group, dimensions },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.values.sum_amount).toBe(400);
    expect(response.json().data.updatedAt).toBeTruthy();
  });

  it("returns 404 when the row does not exist", async () => {
    const server = await buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: `/api/metrics/${metricDefinitionId}/row`,
      headers: authHeaders,
      payload: {
        group: { month: "2026-06" },
        dimensions: { categoryId: "missing" },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("METRIC_ROW_NOT_FOUND");
  });

  it("rejects queries with unknown dimension keys", async () => {
    const server = await buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: `/api/metrics/${metricDefinitionId}/row`,
      headers: authHeaders,
      payload: {
        group: { month: "2026-06" },
        dimensions: { categoryId: "food", extra: "x" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("batch-fetches rows in request order", async () => {
    const server = await buildTestServer();
    const definition = (await metricDefinitionRepository.getById(
      authState.tenantId,
      metricDefinitionId,
    ))!;

    const queries = [
      {
        group: { month: "2026-06" },
        dimensions: { categoryId: "food" },
      },
      {
        group: { month: "2026-05" },
        dimensions: { categoryId: "food" },
      },
    ] as const;

    for (const query of queries) {
      const docId = buildMetricDocId(
        authState.uid,
        query.group,
        query.dimensions,
      );
      await metricValueRepository.applyIncrements(
        authState.tenantId,
        definition.target.collection,
        docId,
        {
          userId: authState.uid,
          group: query.group,
          dimensions: query.dimensions,
          increments: {
            sum_amount: query.group.month === "2026-06" ? 100 : 50,
          },
        },
      );
    }

    const response = await server.inject({
      method: "POST",
      url: `/api/metrics/${metricDefinitionId}/batch`,
      headers: authHeaders,
      payload: {
        queries: [
          ...queries,
          {
            group: { month: "2026-04" },
            dimensions: { categoryId: "food" },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const items = response.json().data.items;
    expect(items).toHaveLength(3);
    expect(items[0]?.values.sum_amount).toBe(100);
    expect(items[1]?.values.sum_amount).toBe(50);
    expect(items[2]).toBeNull();
  });

  it("allows row read when the user has source entity read only", async () => {
    const runtime = await createInMemoryCrudRuntime();
    const server = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
      getRoleCatalog: async () =>
        buildRoleCatalog([
          {
            name: "transactionReader",
            grants: ["transaction.read"],
            tenantId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["transactionReader"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const definition = (await metricDefinitionRepository.getById(
      authState.tenantId,
      metricDefinitionId,
    ))!;
    const group = { month: "2026-06" };
    const dimensions = { categoryId: "food" };
    const docId = buildMetricDocId(authState.uid, group, dimensions);

    await metricValueRepository.applyIncrements(
      authState.tenantId,
      definition.target.collection,
      docId,
      {
        userId: authState.uid,
        group,
        dimensions,
        increments: { sum_amount: 99 },
      },
    );

    const response = await server.inject({
      method: "POST",
      url: `/api/metrics/${metricDefinitionId}/row`,
      headers: authHeaders,
      payload: { group, dimensions },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.values.sum_amount).toBe(99);
  });
});
