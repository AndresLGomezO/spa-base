import { describe, expect, it, vi } from "vitest";
import type {
  TenantAiContextRecord,
  TenantAiContextRepository,
  UserAiMemoryRecord,
  UserAiMemoryRepository,
} from "@repo/ai-context";

import type { AiController } from "../controller/index.js";
import {
  executeGroundedChatTool,
  filterBusinessEntityCitations,
  GROUNDED_CHAT_MAX_STEPS,
  runGroundedChatOrchestrator,
  createMockVertexCachedContentClient,
  selectRelevantCitations,
  topSearchHitCitations,
  type GroundedChatDataPorts,
} from "./index.js";

function createMemoryRepo(): UserAiMemoryRepository {
  const store = new Map<string, UserAiMemoryRecord>();
  return {
    async get(tenantId, userId) {
      return store.get(`${tenantId}::${userId}`) ?? null;
    },
    async upsert(record) {
      store.set(`${record.tenantId}::${record.userId}`, record);
      return record;
    },
    async delete(tenantId, userId) {
      store.delete(`${tenantId}::${userId}`);
    },
    async listUpdatedSince() {
      return [];
    },
    async clearVertexCachesForTenant() {
      return 0;
    },
  };
}

function createContextRepo(): TenantAiContextRepository {
  const store = new Map<string, TenantAiContextRecord>();
  return {
    async get(tenantId, id) {
      return store.get(`${tenantId}::${id}`) ?? null;
    },
    async upsert(record) {
      store.set(`${record.tenantId}::${record.id}`, record);
      return record;
    },
    async delete(tenantId, id) {
      store.delete(`${tenantId}::${id}`);
    },
  };
}

describe("filterBusinessEntityCitations", () => {
  it("keeps only business entity citations with ids", () => {
    const filtered = filterBusinessEntityCitations([
      {
        kind: "entity",
        entityName: "financialItem",
        recordId: "p1",
        label: "Product A",
      },
      {
        kind: "memory",
        label: "portfolio snapshot",
      },
      {
        kind: "entity",
        entityName: "portfolioSettings",
        recordId: "settings",
        label: "Settings",
      },
      {
        kind: "metric",
        metricId: "m1",
        label: "Spend",
      },
      {
        kind: "entity",
        entityName: "financialItem",
        recordId: "p1",
        label: "Product A duplicate",
      },
    ]);

    expect(filtered).toEqual([
      {
        kind: "entity",
        entityName: "financialItem",
        recordId: "p1",
        label: "Product A",
      },
    ]);
  });
});

describe("topSearchHitCitations + selectRelevantCitations", () => {
  it("caps search hits to top 3 by score", () => {
    const citations = topSearchHitCitations(
      Array.from({ length: 10 }, (_, index) => ({
        entityName: "financialItem",
        recordId: `p${index}`,
        label: `Product ${index}`,
        score: index / 10,
      })),
    );
    expect(citations).toHaveLength(3);
    expect(citations.map((c) => c.recordId)).toEqual(["p9", "p8", "p7"]);
  });

  it("prefers citations mentioned in the answer", () => {
    const selected = selectRelevantCitations(
      [
        {
          kind: "entity",
          entityName: "financialItem",
          recordId: "p1",
          label: "Alpha",
        },
        {
          kind: "entity",
          entityName: "financialItem",
          recordId: "p2",
          label: "Beta",
        },
        {
          kind: "entity",
          entityName: "financialItem",
          recordId: "p3",
          label: "Gamma",
        },
      ],
      "Your biggest product is **Beta** at $100.",
    );
    expect(selected).toEqual([
      {
        kind: "entity",
        entityName: "financialItem",
        recordId: "p2",
        label: "Beta",
      },
    ]);
  });
});

describe("runGroundedChatOrchestrator step-cap recovery", () => {
  it("synthesizes from scratchpad when tools succeed but planner never finals", async () => {
    const memoryRepo = createMemoryRepo();
    const contextRepo = createContextRepo();
    await contextRepo.upsert({
      id: "entityCatalog",
      tenantId: "t1",
      kind: "entityCatalog",
      sourceHash: "abc",
      fragments: { "entity.catalog": "Entities: financialItem" },
      updatedAt: new Date().toISOString(),
    });

    let plannerCalls = 0;
    const runAiRequest = vi.fn(async (request) => {
      const stepId =
        request.params.operation === "generateText"
          ? request.params.stepId
          : undefined;
      if (stepId === "groundedChat.synthesis") {
        const chunks = ["Your biggest ", "product is ", "Alpha ($9,999)."];
        let soFar = "";
        for (const chunk of chunks) {
          soFar += chunk;
          await request.onTextChunk?.(soFar);
        }
        return {
          jobId: "child-synth",
          output: { text: soFar },
          rawModelAnswer: soFar,
          durationMs: 1,
        };
      }

      plannerCalls += 1;
      return {
        jobId: `child-plan-${plannerCalls}`,
        output: {
          text: JSON.stringify({
            action: "tool_calls",
            reasoning: "Keep searching",
            toolCalls: [
              {
                name: "semanticSearchRecords",
                args: {
                  entityName: "financialItem",
                  queryText: "biggest amount",
                },
              },
            ],
          }),
        },
        rawModelAnswer: "",
        durationMs: 1,
      };
    });

    const dataPorts: GroundedChatDataPorts = {
      listEntities: async () => [],
      listMetrics: async () => [],
      listQueries: async () => [],
      searchRecords: async () => [],
      semanticSearchRecords: async () => [
        {
          entityName: "financialItem",
          recordId: "p1",
          label: "Alpha",
          fields: { id: "p1", name: "Alpha", amount: 9999 },
          score: 0.91,
        },
      ],
      getRecord: async () => null,
      getUserMemoryFacts: async () => [],
    };

    const partials: string[] = [];
    const result = await runGroundedChatOrchestrator(
      {
        aiController: { runAiRequest } as unknown as AiController,
        vertexAiConfig: {
          projectId: "demo",
          region: "us-central1",
          modelId: "gemini-flash",
          mockEnabled: true,
        },
        tenantAiContextRepository: contextRepo,
        userAiMemoryRepository: memoryRepo,
        dataPorts,
        cacheClient: createMockVertexCachedContentClient(),
        callbacks: {
          onPartialAnswer: async (text) => {
            partials.push(text);
          },
        },
      },
      {
        tenantId: "t1",
        userId: "u1",
        question: "Do you know my biggest product (Amount)?",
        parentJobId: "parent-1",
      },
    );

    expect(plannerCalls).toBe(GROUNDED_CHAT_MAX_STEPS);
    expect(result.answer).toBe("Your biggest product is Alpha ($9,999).");
    expect(result.answer).not.toContain("tool-step limit");
    expect(result.citations).toEqual([
      {
        kind: "entity",
        entityName: "financialItem",
        recordId: "p1",
        label: "Alpha",
      },
    ]);
    expect(partials.at(-1)).toBe(result.answer);
  });
});

describe("executeGroundedChatTool getInsights", () => {
  const basePorts: GroundedChatDataPorts = {
    listEntities: async () => [],
    listMetrics: async () => [],
    listQueries: async () => [],
    searchRecords: async () => [],
    getRecord: async () => null,
    getUserMemoryFacts: async () => [],
  };

  it("returns compressed insights and citations from the port", async () => {
    const ports: GroundedChatDataPorts = {
      ...basePorts,
      getInsights: async (_tenantId, _userId, args) => ({
        surfaceId: args.surfaceId,
        scope: args.scope ?? "2026-07",
        currency: "USD",
        summary: {
          adherenceRate: 0.82,
          openGaps: 3,
        },
        insights: [
          {
            recordId: "adh-1",
            rank: 1,
            title: "Missed check-in streak",
            impactScore: 0.9,
            links: { memberId: "m-1" },
            narrative: "Three consecutive missed check-ins.",
          },
        ],
        citations: [
          {
            kind: "entity",
            entityName: "adherenceInsight",
            recordId: "adh-1",
            label: "Missed check-in streak",
          },
        ],
      }),
    };

    const result = await executeGroundedChatTool(ports, "t1", "u1", {
      name: "getInsights",
      args: { surfaceId: "adherence", scope: "2026-07" },
    });

    expect(result.ok).toBe(true);
    expect(result.retrievalTop1Score).toBeUndefined();
    expect(result.result).toMatchObject({
      surfaceId: "adherence",
      scope: "2026-07",
      currency: "USD",
      summary: { adherenceRate: 0.82, openGaps: 3 },
    });
    expect(result.citations).toEqual([
      {
        kind: "entity",
        entityName: "adherenceInsight",
        recordId: "adh-1",
        label: "Missed check-in streak",
      },
    ]);
  });

  it("returns unavailable when the port is missing", async () => {
    const result = await executeGroundedChatTool(basePorts, "t1", "u1", {
      name: "getInsights",
      args: { surfaceId: "adherence" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("getInsights is unavailable");
  });

  it("rejects missing surfaceId", async () => {
    const ports: GroundedChatDataPorts = {
      ...basePorts,
      getInsights: async () => null,
    };
    const result = await executeGroundedChatTool(ports, "t1", "u1", {
      name: "getInsights",
      args: {},
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("surfaceId is required");
  });

  it("rejects invalid scope format", async () => {
    const ports: GroundedChatDataPorts = {
      ...basePorts,
      getInsights: async () => null,
    };
    const result = await executeGroundedChatTool(ports, "t1", "u1", {
      name: "getInsights",
      args: { surfaceId: "adherence", scope: "July-2026" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('scope must be "YYYY-MM" when provided');
  });
});

describe("runGroundedChatOrchestrator getInsights loop", () => {
  it("uses getInsights findings and cites adherenceInsight only", async () => {
    const memoryRepo = createMemoryRepo();
    const contextRepo = createContextRepo();
    await contextRepo.upsert({
      id: "entityCatalog",
      tenantId: "t1",
      kind: "entityCatalog",
      sourceHash: "abc",
      fragments: { "entity.catalog": "Entities: adherenceInsight" },
      updatedAt: new Date().toISOString(),
    });

    let plannerCalls = 0;
    const runAiRequest = vi.fn(async (request) => {
      const stepId =
        request.params.operation === "generateText"
          ? request.params.stepId
          : undefined;
      if (stepId === "groundedChat.synthesis") {
        return {
          jobId: "child-synth",
          output: {
            text: "Adherence is slipping: **3 open gaps**, led by [Missed check-in streak](record:adherenceInsight/adh-1).",
          },
          rawModelAnswer: "",
          durationMs: 1,
        };
      }

      plannerCalls += 1;
      if (plannerCalls === 1) {
        return {
          jobId: "child-plan-1",
          output: {
            text: JSON.stringify({
              action: "tool_calls",
              reasoning: "Need adherence insights",
              toolCalls: [
                {
                  name: "getInsights",
                  args: { surfaceId: "adherence", scope: "2026-07" },
                },
              ],
            }),
          },
          rawModelAnswer: "",
          durationMs: 1,
        };
      }
      return {
        jobId: "child-plan-2",
        output: {
          text: JSON.stringify({
            action: "final",
            confidence: 0.8,
            answer: "Draft answer",
          }),
        },
        rawModelAnswer: "",
        durationMs: 1,
      };
    });

    const dataPorts: GroundedChatDataPorts = {
      listEntities: async () => [],
      listMetrics: async () => [],
      listQueries: async () => [],
      searchRecords: async () => [],
      getRecord: async () => null,
      getUserMemoryFacts: async () => [],
      getInsights: async () => ({
        surfaceId: "adherence",
        scope: "2026-07",
        currency: "USD",
        summary: { openGaps: 3 },
        insights: [
          {
            recordId: "adh-1",
            rank: 1,
            title: "Missed check-in streak",
            impactScore: 0.9,
            links: {},
          },
        ],
        portfolioNarrative: "Portfolio adherence rollup (do not cite).",
        citations: [
          {
            kind: "entity",
            entityName: "adherenceInsight",
            recordId: "adh-1",
            label: "Missed check-in streak",
          },
          {
            kind: "entity",
            entityName: "portfolioSettings",
            recordId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            label: "Settings",
          },
        ],
      }),
    };

    const result = await runGroundedChatOrchestrator(
      {
        aiController: { runAiRequest } as unknown as AiController,
        vertexAiConfig: {
          projectId: "demo",
          region: "us-central1",
          modelId: "gemini-flash",
          mockEnabled: true,
        },
        tenantAiContextRepository: contextRepo,
        userAiMemoryRepository: memoryRepo,
        dataPorts,
        cacheClient: createMockVertexCachedContentClient(),
        isAiTraceEnabled: () => true,
      },
      {
        tenantId: "t1",
        userId: "u1",
        question: "What are my adherence insights this month?",
        parentJobId: "parent-adh-1",
      },
    );

    expect(result.scratchpad).toContain("Tool getInsights (ok)");
    expect(result.scratchpad).toContain("openGaps");
    expect(result.answer).toContain("Missed check-in streak");
    expect(result.citations).toEqual([
      {
        kind: "entity",
        entityName: "adherenceInsight",
        recordId: "adh-1",
        label: "Missed check-in streak",
      },
    ]);
    expect(
      (result.citations ?? []).some(
        (c) => c.entityName === "portfolioSettings",
      ),
    ).toBe(false);
  });
});
