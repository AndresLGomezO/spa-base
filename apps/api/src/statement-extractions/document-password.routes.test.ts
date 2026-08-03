import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";
import { buildRoleCatalog } from "@repo/rbac";

import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { buildServer } from "../server.js";

vi.hoisted(() => {
  process.env.WORKER_SERVICE_URL = "http://127.0.0.1:3999";
  process.env.AI_TASKS_LOCAL_DISPATCH = "true";
  process.env.DOCUMENT_EXTRACTION_TASKS_LOCAL_DISPATCH = "true";
  process.env.TENANT_ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 9).toString(
    "base64",
  );
});

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

const authHeaders = {
  authorization: "Bearer test-token",
  "x-firebase-appcheck": "test-app-check",
};

describe("document password routes", () => {
  const tenantRepository = createInMemoryTenantRepository();
  let entityDefinitionRepository = createInMemoryEntityDefinitionRepository();

  beforeEach(async () => {
    entityDefinitionRepository = createInMemoryEntityDefinitionRepository();
    await entityDefinitionRepository.create("tenant_a", {
      name: "financialItem",
      label: "Financial Items",
      fields: [
        { name: "name", type: "string", required: true },
        {
          name: "documentPasswords",
          type: "string",
          required: false,
          sensitive: true,
        },
      ],
    });
  });

  async function buildTestServer(
    roles: Record<string, readonly string[]> = { tenant_a: ["admin"] },
  ) {
    return buildServer({
      logger: false,
      repositories: {},
      entityDefinitionRepository,
      tenantRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: roles,
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
  }

  async function createFinancialItem(
    server: Awaited<ReturnType<typeof buildTestServer>>,
  ): Promise<string> {
    const res = await server.inject({
      method: "POST",
      url: "/api/financialItem",
      headers: authHeaders,
      payload: { name: "Visa card" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { data: { id: string } };
    return body.data.id;
  }

  it("PUT then GET returns documentTypes without plaintext password", async () => {
    const server = await buildTestServer();
    await server.ready();
    const id = await createFinancialItem(server);

    const putRes = await server.inject({
      method: "PUT",
      url: `/api/financial-items/${id}/document-passwords/STATEMENT`,
      headers: authHeaders,
      payload: { password: "super-secret" },
    });
    expect(putRes.statusCode).toBe(200);
    const putBody = putRes.json() as {
      data: { documentTypes: string[] };
    };
    expect(putBody.data.documentTypes).toEqual(["STATEMENT"]);
    expect(JSON.stringify(putBody)).not.toContain("super-secret");

    const getRes = await server.inject({
      method: "GET",
      url: `/api/financial-items/${id}/document-passwords`,
      headers: authHeaders,
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json() as {
      data: { documentTypes: string[] };
    };
    expect(getBody.data.documentTypes).toEqual(["STATEMENT"]);
    expect(JSON.stringify(getBody)).not.toContain("super-secret");

    const crudRes = await server.inject({
      method: "GET",
      url: `/api/financialItem/${id}`,
      headers: authHeaders,
    });
    expect(crudRes.statusCode).toBe(200);
    const crudBody = crudRes.json() as { data: Record<string, unknown> };
    expect(crudBody.data.documentPasswords).toBeUndefined();

    await server.close();
  });

  it("DELETE removes the password for a document type", async () => {
    const server = await buildTestServer();
    await server.ready();
    const id = await createFinancialItem(server);

    await server.inject({
      method: "PUT",
      url: `/api/financial-items/${id}/document-passwords/STATEMENT`,
      headers: authHeaders,
      payload: { password: "super-secret" },
    });

    const delRes = await server.inject({
      method: "DELETE",
      url: `/api/financial-items/${id}/document-passwords/STATEMENT`,
      headers: authHeaders,
    });
    expect(delRes.statusCode).toBe(200);
    const delBody = delRes.json() as {
      data: { documentTypes: string[] };
    };
    expect(delBody.data.documentTypes).toEqual([]);

    await server.close();
  });

  it("returns 403 without financialItem.update", async () => {
    const server = await buildServer({
      logger: false,
      repositories: {},
      entityDefinitionRepository,
      tenantRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["viewer"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
    await server.ready();

    const res = await server.inject({
      method: "GET",
      url: "/api/financial-items/fi_1/document-passwords",
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });
});
