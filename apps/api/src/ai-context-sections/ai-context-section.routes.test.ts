import { describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import {
  createInMemoryAiContextSectionRepository,
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

describe("AI context section routes", () => {
  async function buildTestServer() {
    const aiContextSectionRepository =
      createInMemoryAiContextSectionRepository();
    const userAiMemoryRepository = createInMemoryUserAiMemoryRepository();
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
      aiContextSectionRepository,
      userAiMemoryRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: "superadmin" as const,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    return { server, aiContextSectionRepository, userAiMemoryRepository };
  }

  const authHeaders = {
    authorization: "Bearer test-token",
    "x-firebase-appcheck": "test-app-check",
  };

  it("supports CRUD and invalidates user AI memory caches on write", async () => {
    const { server, aiContextSectionRepository, userAiMemoryRepository } =
      await buildTestServer();
    await server.ready();

    const created = await server.inject({
      method: "POST",
      url: "/api/ai-context-sections",
      headers: authHeaders,
      payload: {
        name: "Profile",
        blocks: [{ kind: "staticMarkdown", content: "Hello" }],
      },
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as {
      data: { id: string; name: string };
    };
    expect(createdBody.data.name).toBe("Profile");

    const memoryAfterCreate = await userAiMemoryRepository.get(
      "tenant_a",
      "user_1",
    );
    expect(memoryAfterCreate?.vertexCacheName).toBeNull();

    await userAiMemoryRepository.upsert({
      ...memoryAfterCreate!,
      vertexCacheName: "projects/x/locations/y/cachedContents/z2",
      vertexCacheExpireAt: "2099-01-01T00:00:00.000Z",
    });

    const listed = await server.inject({
      method: "GET",
      url: "/api/ai-context-sections",
      headers: authHeaders,
    });
    expect(listed.statusCode).toBe(200);
    const listBody = listed.json() as { data: { items: { id: string }[] } };
    expect(listBody.data.items).toHaveLength(1);

    const patched = await server.inject({
      method: "PATCH",
      url: `/api/ai-context-sections/${createdBody.data.id}`,
      headers: authHeaders,
      payload: { name: "Profile v2", enabled: false },
    });
    expect(patched.statusCode).toBe(200);
    expect(
      (
        await aiContextSectionRepository.getById(
          "tenant_a",
          createdBody.data.id,
        )
      )?.name,
    ).toBe("Profile v2");
    expect(
      (await userAiMemoryRepository.get("tenant_a", "user_1"))?.vertexCacheName,
    ).toBeNull();

    const deleted = await server.inject({
      method: "DELETE",
      url: `/api/ai-context-sections/${createdBody.data.id}`,
      headers: authHeaders,
    });
    expect(deleted.statusCode).toBe(200);
    expect(
      await aiContextSectionRepository.getById("tenant_a", createdBody.data.id),
    ).toBeNull();

    await server.close();
  });

  it("replaces the catalog via PUT", async () => {
    const { server, aiContextSectionRepository } = await buildTestServer();
    await server.ready();

    const now = "2026-01-01T00:00:00.000Z";
    const response = await server.inject({
      method: "PUT",
      url: "/api/ai-context-sections/catalog",
      headers: authHeaders,
      payload: {
        kind: "ai-context-sections-catalog",
        version: 1,
        items: [
          {
            id: "aics_catalog_1",
            tenantId: "tenant_a",
            name: "Catalog section",
            order: 1,
            enabled: true,
            scope: "tenantWide",
            visibility: {},
            blocks: [{ kind: "staticMarkdown", content: "From catalog" }],
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const listed = await aiContextSectionRepository.list("tenant_a");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("aics_catalog_1");

    await server.close();
  });
});
