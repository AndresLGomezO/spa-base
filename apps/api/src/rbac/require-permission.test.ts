import { describe, expect, it, vi } from "vitest";

import type { FastifyReply, FastifyRequest } from "fastify";

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
  it("returns 403 when permission is missing", async () => {
    const deps: LoadRequestPermissionsDeps = {
      getUserAccessProfile: vi.fn(async () => ({
        platformRole: null,
        tenants: { tenant_a: ["viewer"] },
      })),
    };
    const requirePermission = createRequirePermission(deps, "customer.create");
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
    };
    const requirePermission = createRequirePermission(deps, "customer.create");
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
    expect(request.ctx?.permissions).toContain("customer.create");
  });
});
