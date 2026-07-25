import { describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import {
  createInMemoryEntityDefinitionRepository,
  createInMemoryTenantAiContextRepository,
  createInMemoryUserAiMemoryRepository,
} from "@repo/firestore-converters";

import { buildServer } from "../server.js";

vi.mock("@repo/gcp-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/gcp-firebase")>();
  return {
    ...actual,
    verifyFirebaseIdToken: vi.fn(async () => ({
      uid: "user_123",
      tenantId: "tenant_a",
      email: "demo@example.com",
    })),
    verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  };
});

describe("AI record summary template routes", () => {
  async function buildTestServer() {
    const tenantAiContextRepository = createInMemoryTenantAiContextRepository();
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();
    const userAiMemoryRepository = createInMemoryUserAiMemoryRepository();

    await entityDefinitionRepository.create("tenant_a", {
      name: "deal",
      label: "Deals",
      fields: [{ name: "name", type: "string", required: true }],
    });

    await userAiMemoryRepository.upsert({
      id: "user_1",
      tenantId: "tenant_a",
      userId: "user_1",
      profileFragment: "",
      dataSnapshot: "old",
      factIndex: [],
      sourceHash: "hash",
      vertexCacheName: "projects/x/locations/y/cachedContents/z",
      vertexCacheExpireAt: "2099-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const server = await buildServer({
      logger: false,
      repositories: {},
      tenantAiContextRepository,
      entityDefinitionRepository,
      userAiMemoryRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: "superadmin" as const,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    return {
      server,
      tenantAiContextRepository,
      userAiMemoryRepository,
    };
  }

  const authHeaders = {
    authorization: "Bearer test-token",
    "x-firebase-appcheck": "test-app-check",
  };

  const templateBody = {
    textTemplate: "{{name}} — {{status}}",
    jsonFields: ["name", "status"],
    embeddingFields: [],
    piiLevel: { status: "masked" as const },
  };

  it("supports CRUD and invalidates user AI memory caches on write", async () => {
    const { server, userAiMemoryRepository } = await buildTestServer();
    await server.ready();

    const created = await server.inject({
      method: "PUT",
      url: "/api/ai-record-summary-templates/deal",
      headers: authHeaders,
      payload: templateBody,
    });
    expect(created.statusCode).toBe(200);
    const createdBody = created.json() as {
      data: { entityName: string; template: typeof templateBody };
    };
    expect(createdBody.data.entityName).toBe("deal");
    expect(createdBody.data.template.textTemplate).toBe(
      templateBody.textTemplate,
    );

    const memoryAfterPut = await userAiMemoryRepository.get(
      "tenant_a",
      "user_1",
    );
    expect(memoryAfterPut?.vertexCacheName).toBeNull();

    await userAiMemoryRepository.upsert({
      ...memoryAfterPut!,
      vertexCacheName: "projects/x/locations/y/cachedContents/z2",
      vertexCacheExpireAt: "2099-01-01T00:00:00.000Z",
    });

    const listed = await server.inject({
      method: "GET",
      url: "/api/ai-record-summary-templates",
      headers: authHeaders,
    });
    expect(listed.statusCode).toBe(200);
    const listedBody = listed.json() as {
      data: { items: readonly { entityName: string }[] };
    };
    expect(listedBody.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityName: "deal" })]),
    );

    const got = await server.inject({
      method: "GET",
      url: "/api/ai-record-summary-templates/deal",
      headers: authHeaders,
    });
    expect(got.statusCode).toBe(200);

    const deleted = await server.inject({
      method: "DELETE",
      url: "/api/ai-record-summary-templates/deal",
      headers: authHeaders,
    });
    expect(deleted.statusCode).toBe(204);

    const memoryAfterDelete = await userAiMemoryRepository.get(
      "tenant_a",
      "user_1",
    );
    expect(memoryAfterDelete?.vertexCacheName).toBeNull();

    const missing = await server.inject({
      method: "GET",
      url: "/api/ai-record-summary-templates/deal",
      headers: authHeaders,
    });
    expect(missing.statusCode).toBe(404);

    await server.close();
  });

  it("rejects unauthenticated requests", async () => {
    const { server } = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/ai-record-summary-templates",
    });
    expect(response.statusCode).toBe(401);

    await server.close();
  });
});
