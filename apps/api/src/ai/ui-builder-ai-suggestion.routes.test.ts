import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import {
  createInMemoryAiJobRepository,
  createInMemoryUiBuilderAiSuggestionRepository,
} from "@repo/firestore-converters";

import { buildServer } from "../server.js";

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

describe("UI builder AI suggestion routes", () => {
  const uiBuilderAiSuggestionRepository =
    createInMemoryUiBuilderAiSuggestionRepository();

  beforeEach(() => {
    uiBuilderAiSuggestionRepository.records.clear();
  });

  async function buildTestServer(
    roles: Record<string, readonly string[]> = { tenant_a: ["admin"] },
  ) {
    return buildServer({
      logger: false,
      repositories: {},
      aiJobRepository: createInMemoryAiJobRepository(),
      uiBuilderAiSuggestionRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: roles,
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
  }

  it("lists suggestions scoped to entity and surface", async () => {
    await uiBuilderAiSuggestionRepository.create("tenant_a", {
      entityName: "widget",
      surface: "list",
      jobId: "aijob_1",
      status: "ready",
      listViewType: "table",
      sliceData: { listViewType: "table" },
      createdBy: authState.uid,
    });
    await uiBuilderAiSuggestionRepository.create("tenant_a", {
      entityName: "bank",
      surface: "list",
      jobId: "aijob_2",
      status: "ready",
      createdBy: authState.uid,
    });

    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/entities/widget/ui-builder/ai-suggestions?surface=list",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { suggestions: Array<{ entityName: string }> };
    };
    expect(body.data.suggestions).toHaveLength(1);
    expect(body.data.suggestions[0]?.entityName).toBe("widget");

    await server.close();
  });

  it("returns a suggestion by id", async () => {
    const created = await uiBuilderAiSuggestionRepository.create("tenant_a", {
      entityName: "widget",
      surface: "list",
      jobId: "aijob_3",
      status: "ready",
      createdBy: authState.uid,
    });

    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: `/api/entities/widget/ui-builder/ai-suggestions/${created.id}`,
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { suggestion: { id: string } } };
    expect(body.data.suggestion.id).toBe(created.id);

    await server.close();
  });

  it("returns 403 when ai.uiBuilder.read permission is missing", async () => {
    const server = await buildTestServer({ tenant_a: [] });
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/entities/widget/ui-builder/ai-suggestions?surface=list",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(403);

    await server.close();
  });
});
