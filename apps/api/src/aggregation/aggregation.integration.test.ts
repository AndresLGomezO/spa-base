import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { processAggregationEventTransaction } from "./process-aggregation-event-transaction.js";
import { createMetricRuntimeContext } from "./metric-runtime-context.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
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
  configureIndexProvisioningQueue: vi.fn(),
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
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
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
    joinRepository: createInMemoryJoinCollectionRepository(),
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

describe("aggregation integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    metricDefinitionRepository.store.clear();
    aggregationEventRepository.store.clear();
    metricValueRepository.store.clear();
    backfillJobRepository.store.clear();
  });

  it("emits events only for entities with active metrics and updates values", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "loan",
        label: "Loans",
        fields: [
          { name: "amount", type: "number", required: true },
          { name: "status", type: "string", required: false },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);

    const metricResponse = await server.inject({
      method: "POST",
      url: "/api/metric-definitions",
      headers: authHeaders,
      payload: {
        name: "Loan amount total",
        sourceModel: "loan",
        filters: [],
        groupBy: [],
        dimensions: [],
        aggregations: [{ field: "amount", operation: "SUM" }],
        target: { collection: "loan_amount_total", granularity: "dynamic" },
        schemaVersionDependency: 1,
        fieldsDependency: ["amount"],
        status: "ACTIVE",
      },
    });
    expect(metricResponse.statusCode).toBe(201);

    const createLoan = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 250 },
    });
    expect(createLoan.statusCode).toBe(201);

    const events = [...aggregationEventRepository.store.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.model).toBe("loan");
    expect(events[0]?.operation).toBe("CREATE");

    const metricValues = [...metricValueRepository.store.values()];
    expect(metricValues).toHaveLength(1);
    expect(metricValues[0]?.values.sum_amount).toBe(250);

    const processed = await aggregationEventRepository.getById(
      authState.tenantId,
      events[0]!.eventId,
    );
    expect(processed?.status).toBe("PROCESSED");

    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
    });

    await processAggregationEventTransaction(
      metricRuntime,
      authState.tenantId,
      events[0]!.eventId,
    );
    expect(metricValues[0]?.values.sum_amount).toBe(250);
  });
});
