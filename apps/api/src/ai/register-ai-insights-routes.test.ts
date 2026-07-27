import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAiRecordSummaryDocId } from "@repo/ai-context";
import { buildRoleCatalog } from "@repo/rbac";
import {
  createInMemoryAiJobRepository,
  createInMemoryAiRecordSummaryRepository,
  createInMemoryAiSpendRepository,
  createInMemoryInsightSurfaceRepository,
} from "@repo/firestore-converters";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { buildServer } from "../server.js";

vi.hoisted(() => {
  process.env.WORKER_SERVICE_URL = "http://127.0.0.1:3999";
  process.env.AI_TASKS_LOCAL_DISPATCH = "true";
});

const WORKER_URL = "http://127.0.0.1:3999";
const SETTINGS_ID = "settings_singleton";
const SCOPE = "2026-07";

vi.mock("@repo/gcp-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/gcp-firebase")>();
  return {
    ...actual,
    verifyFirebaseIdToken: vi.fn(async () => ({
      uid: authState.uid,
      tenantId: authState.tenantId,
      email: "demo@example.com",
    })),
    verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  };
});

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

type GenericRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
};

describe("AI insights routes (generic surfaces)", () => {
  const aiJobRepository = createInMemoryAiJobRepository();
  let aiSpendRepository = createInMemoryAiSpendRepository();
  let tenantRepository = createInMemoryTenantRepository();
  let aiRecordSummaryRepository = createInMemoryAiRecordSummaryRepository();
  let insightSurfaceRepository = createInMemoryInsightSurfaceRepository();
  let insightRepo = createInMemoryEntityRepository<GenericRecord>();
  let settingsRepo = createInMemoryEntityRepository<GenericRecord>();
  const enqueuedPaths: string[] = [];

  beforeEach(() => {
    aiSpendRepository = createInMemoryAiSpendRepository();
    tenantRepository = createInMemoryTenantRepository();
    aiRecordSummaryRepository = createInMemoryAiRecordSummaryRepository();
    insightSurfaceRepository = createInMemoryInsightSurfaceRepository();
    insightRepo = createInMemoryEntityRepository<GenericRecord>();
    settingsRepo = createInMemoryEntityRepository<GenericRecord>();
    enqueuedPaths.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith(WORKER_URL)) {
          enqueuedPaths.push(url.slice(WORKER_URL.length));
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  async function seedHealthcareSurface() {
    await insightSurfaceRepository.create("tenant_a", {
      id: "adherence",
      permission: "ai.chat.run",
      labels: {
        en: {
          title: "Adherence insights",
          description: "Patient adherence rankings",
          emptyScope: "No adherence insights yet.",
          summary: { adherenceRate: "Adherence rate" },
          portfolioNarrativeTitle: "Clinic adherence overview",
        },
      },
      chat: {
        toolDescription: "Reads compressed adherence insights.",
        progressLabel: { en: "Reading adherence insights…" },
      },
      insight: {
        entity: "adherenceInsight",
        narrativeVariant: "insights",
        topN: 5,
        titleField: "title",
        rankField: "rank",
        impactScoreField: "impactScore",
        linkFields: [{ field: "patientId", entity: "patient" }],
      },
      scope: { field: "month", queryParam: "month", format: "YYYY-MM" },
      portfolio: {
        entity: "clinicSettings",
        recordId: SETTINGS_ID,
        narrativeVariant: "adherence",
        signalsField: "adherenceSignalsJson",
        currencyField: "currencyBase",
      },
      summary: {
        signalFields: [
          {
            path: "adherenceRate",
            labelKey: "adherenceRate",
            format: "number",
          },
        ],
      },
      ui: { showInHome: true, homeOrder: 1, tabOrder: 1 },
    });

    await settingsRepo.create("tenant_a", {
      id: SETTINGS_ID,
      tenantId: "tenant_a",
      ownerId: authState.uid,
      currencyBase: "USD",
      adherenceSignalsJson: JSON.stringify({ adherenceRate: 0.82 }),
    });
    await insightRepo.create("tenant_a", {
      id: "ai_missed",
      tenantId: "tenant_a",
      ownerId: authState.uid,
      month: SCOPE,
      title: "Missed doses rising",
      patientId: "patient_1",
      rank: 1,
      impactScore: 90,
    });
    await insightRepo.create("tenant_a", {
      id: "ai_stable",
      tenantId: "tenant_a",
      ownerId: authState.uid,
      month: SCOPE,
      title: "Stable regimen",
      patientId: "patient_2",
      rank: 2,
      impactScore: 20,
    });

    const now = new Date().toISOString();
    await aiRecordSummaryRepository.upsert({
      id: buildAiRecordSummaryDocId("adherenceInsight", "ai_missed"),
      tenantId: "tenant_a",
      entityName: "adherenceInsight",
      recordId: "ai_missed",
      ownerId: authState.uid,
      accessUserIds: [authState.uid],
      tenantWideRead: false,
      contextHash: "hash-missed-v2",
      context: { title: "Missed doses rising" },
      narratives: {
        insights: {
          text: "Missed doses are climbing for this patient cohort.",
          sourceHash: "hash-missed-v1",
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    });
    await aiRecordSummaryRepository.upsert({
      id: buildAiRecordSummaryDocId("adherenceInsight", "ai_stable"),
      tenantId: "tenant_a",
      entityName: "adherenceInsight",
      recordId: "ai_stable",
      ownerId: authState.uid,
      accessUserIds: [authState.uid],
      tenantWideRead: false,
      contextHash: "hash-stable-v1",
      context: { title: "Stable regimen" },
      narratives: {
        insights: {
          text: "Regimen adherence remains stable.",
          sourceHash: "hash-stable-v1",
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    });
    await aiRecordSummaryRepository.upsert({
      id: buildAiRecordSummaryDocId("clinicSettings", SETTINGS_ID),
      tenantId: "tenant_a",
      entityName: "clinicSettings",
      recordId: SETTINGS_ID,
      ownerId: authState.uid,
      accessUserIds: [authState.uid],
      tenantWideRead: false,
      contextHash: "hash-clinic-adherence-v2",
      context: { month: SCOPE },
      narratives: {
        adherence: {
          text: "Clinic-wide adherence is soft in the current month.",
          sourceHash: "hash-clinic-adherence-v1",
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  async function buildTestServer(
    roles: Record<string, readonly string[]> = { tenant_a: ["admin"] },
  ) {
    return buildServer({
      logger: false,
      repositories: {
        adherenceInsight: insightRepo,
        clinicSettings: settingsRepo,
      },
      insightSurfaceRepository,
      aiJobRepository,
      aiSpendRepository,
      tenantRepository,
      aiRecordSummaryRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: roles,
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
  }

  it("lists registered surfaces without finance vocabulary", async () => {
    await seedHealthcareSurface();
    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/ai/insight-surfaces?locale=en",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { surfaces: Array<{ id: string; labels: { title: string } }> };
    };
    expect(body.data.surfaces).toHaveLength(1);
    expect(body.data.surfaces[0]?.id).toBe("adherence");
    expect(body.data.surfaces[0]?.labels.title).toBe("Adherence insights");

    await server.close();
  });

  it("returns compressed insights for a synthetic healthcare surface", async () => {
    await seedHealthcareSurface();
    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: `/api/ai/insights/adherence?month=${SCOPE}`,
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        surfaceId: string;
        scope: string;
        currency?: string;
        summary: Record<string, number>;
        insights: Array<{
          recordId: string;
          title: string;
          narrative?: string;
          links: Record<string, string>;
        }>;
        portfolioNarrative?: string;
      };
    };
    expect(body.data.surfaceId).toBe("adherence");
    expect(body.data.scope).toBe(SCOPE);
    expect(body.data.currency).toBe("USD");
    expect(body.data.summary.adherenceRate).toBe(0.82);
    expect(body.data.insights).toHaveLength(2);
    expect(body.data.insights[0]?.recordId).toBe("ai_missed");
    expect(body.data.insights[0]?.links.patientId).toBe("patient_1");
    expect(body.data.insights[0]?.narrative).toContain("Missed doses");
    expect(body.data.portfolioNarrative).toContain("Clinic-wide");

    await server.close();
  });

  it("returns 403 without ai.chat.run", async () => {
    await seedHealthcareSurface();
    const server = await buildTestServer({ tenant_a: ["viewer"] });
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: `/api/ai/insights/adherence?month=${SCOPE}`,
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(403);
    await server.close();
  });

  it("enqueues stale narrative refreshes and skips current ones", async () => {
    await seedHealthcareSurface();
    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/ai/insights/adherence/refresh",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
      payload: { month: SCOPE },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        surfaceId: string;
        scope: string;
        enqueued: number;
        alreadyCurrent: number;
      };
    };
    expect(body.data.surfaceId).toBe("adherence");
    expect(body.data.scope).toBe(SCOPE);
    expect(body.data.enqueued).toBe(2); // missed + clinic
    expect(body.data.alreadyCurrent).toBe(1); // stable
    expect(enqueuedPaths).toEqual([
      "/tasks/refresh-record-narrative",
      "/tasks/refresh-record-narrative",
    ]);

    await server.close();
  });

  it("returns 403 when spend guard rejects refresh", async () => {
    await seedHealthcareSurface();
    await tenantRepository.update("tenant_a", {
      aiLimits: { monthlyInputTokens: 10 },
    });
    const period = new Date().toISOString().slice(0, 7);
    await aiSpendRepository.incrementTenantPeriod("tenant_a", period, {
      inputTokens: 11,
      outputTokens: 0,
      estimatedCostUsd: 0,
    });

    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/ai/insights/adherence/refresh",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
      payload: { month: SCOPE },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe("ai.spend_limit");
    expect(enqueuedPaths).toHaveLength(0);

    await server.close();
  });
});
