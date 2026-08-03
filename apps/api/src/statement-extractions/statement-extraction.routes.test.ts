import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryStatementExtractionRepository } from "@repo/firestore-converters";
import {
  createLocalKmsEnvelopeClient,
  encryptEnvelope,
} from "@repo/encryption";
import { buildRoleCatalog } from "@repo/rbac";

import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { buildServer } from "../server.js";

vi.hoisted(() => {
  process.env.WORKER_SERVICE_URL = "http://127.0.0.1:3999";
  process.env.AI_TASKS_LOCAL_DISPATCH = "true";
  process.env.DOCUMENT_EXTRACTION_TASKS_LOCAL_DISPATCH = "true";
  process.env.DOCUMENT_EXTRACTION_TASKS_QUEUE_NAME = "document-extraction-test";
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

const MASTER_KEY = process.env.TENANT_ENCRYPTION_MASTER_KEY!;

describe("statement extraction routes", () => {
  let statementExtractionRepository =
    createInMemoryStatementExtractionRepository();
  const tenantRepository = createInMemoryTenantRepository();

  beforeEach(() => {
    statementExtractionRepository =
      createInMemoryStatementExtractionRepository();
  });

  async function buildTestServer(
    roles: Record<string, readonly string[]> = { tenant_a: ["admin"] },
  ) {
    return buildServer({
      logger: false,
      repositories: {},
      statementExtractionRepository,
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

  it("lists awaitingReview extractions without encryptedPayload", async () => {
    const kms = createLocalKmsEnvelopeClient(MASTER_KEY);
    const encrypted = await encryptEnvelope(
      JSON.stringify({ closingBalance: 100 }),
      kms,
      "tenant_a|att_1|ext_1",
    );
    await statementExtractionRepository.create({
      id: "ext_1",
      tenantId: "tenant_a",
      attachmentId: "att_1",
      status: "awaitingReview",
      preview: { closingBalance: 100, productNumberLast4: "4242" },
      encryptedPayload: encrypted,
      dlpFindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const server = await buildTestServer();
    await server.ready();

    const res = await server.inject({
      method: "GET",
      url: "/api/statement-extractions?status=awaitingReview",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: { items: Array<Record<string, unknown>> };
    };
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.encryptedPayload).toBeUndefined();
    expect(body.data.items[0]?.preview).toMatchObject({
      productNumberLast4: "4242",
    });
    await server.close();
  });

  it("returns 403 without ai.documentExtract.read", async () => {
    const server = await buildServer({
      logger: false,
      repositories: {},
      statementExtractionRepository,
      tenantRepository,
      getRoleCatalog: async () => ({
        empty: { grants: [] },
      }),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["empty"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
    await server.ready();

    const res = await server.inject({
      method: "GET",
      url: "/api/statement-extractions",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("rejects without ai.documentExtract.run when role lacks it", async () => {
    // viewer typically lacks documentExtract.run
    const kms = createLocalKmsEnvelopeClient(MASTER_KEY);
    const encrypted = await encryptEnvelope("{}", kms, "tenant_a|att|ext_2");
    await statementExtractionRepository.create({
      id: "ext_2",
      tenantId: "tenant_a",
      attachmentId: "att",
      status: "awaitingReview",
      preview: {},
      encryptedPayload: encrypted,
      dlpFindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const server = await buildTestServer({ tenant_a: ["viewer"] });
    await server.ready();

    const res = await server.inject({
      method: "POST",
      url: "/api/statement-extractions/ext_2/reject",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });
});
