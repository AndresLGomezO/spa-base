import { describe, expect, it, vi } from "vitest";

import type { FastifyReply, FastifyRequest } from "fastify";

import { buildRoleCatalog } from "@repo/rbac";

import { createRequirePermission } from "./create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "./load-request-permissions.js";

function createMockReply() {
  const reply = {
    statusCode: 200,
    payload: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.payload = body;
      return this;
    },
  };
  return reply as unknown as FastifyReply & {
    statusCode: number;
    payload: unknown;
  };
}

describe("createRequirePermission", () => {
  const roleCatalog = buildRoleCatalog([]);

  it("returns 403 when permission is missing", async () => {
    const deps: LoadRequestPermissionsDeps = {
      getUserAccessProfile: vi.fn(async () => ({
        platformRole: null,
        tenants: { tenant_a: ["viewer"] },
      })),
      getRoleCatalog: vi.fn(async () => roleCatalog),
    };
    const requirePermission = createRequirePermission(
      deps,
      "organization.create",
    );
    const request = {
      ctx: {
        uid: "user_123",
        tenantId: "tenant_a",
        claims: {},
      },
    } as FastifyRequest;
    const reply = createMockReply();

    await requirePermission(request, reply);

    expect(reply.statusCode).toBe(403);
  });

  it("allows request when permission is granted", async () => {
    const deps: LoadRequestPermissionsDeps = {
      getUserAccessProfile: vi.fn(async () => ({
        platformRole: null,
        tenants: { tenant_a: ["admin"] },
      })),
      getRoleCatalog: vi.fn(async () => roleCatalog),
    };
    const requirePermission = createRequirePermission(
      deps,
      "organization.create",
    );
    const request = {
      ctx: {
        uid: "user_123",
        tenantId: "tenant_a",
        claims: {},
      },
    } as FastifyRequest;
    const reply = createMockReply();

    await requirePermission(request, reply);

    expect(reply.statusCode).toBe(200);
    expect(request.ctx?.permissions).toContain("organization.create");
  });
});
