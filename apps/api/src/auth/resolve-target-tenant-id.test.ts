import { describe, expect, it } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
  parseQueryTenantId,
  requireTargetTenant,
  resolveTargetTenantId,
} from "./resolve-target-tenant-id.js";

function createRequest(
  ctx: FastifyRequest["ctx"],
  query: Record<string, unknown> = {},
): FastifyRequest {
  return { ctx, query } as FastifyRequest;
}

function createReply(): FastifyReply {
  const reply = {
    statusCode: 200,
    payload: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  return reply as unknown as FastifyReply;
}

describe("resolveTargetTenantId", () => {
  it("uses JWT tenant for regular users", () => {
    const request = createRequest({
      uid: "user_1",
      tenantId: "tenant_a",
      claims: {},
      isSuperAdmin: false,
    });

    expect(resolveTargetTenantId(request, "tenant_b")).toBe("tenant_a");
    expect(
      parseQueryTenantId(
        createRequest(
          { uid: "user_1", tenantId: "", claims: {} },
          { tenantId: "tenant_b" },
        ),
      ),
    ).toBe("tenant_b");
  });

  it("allows superadmin query override", () => {
    const request = createRequest({
      uid: "admin_1",
      tenantId: "tenant_a",
      claims: {},
      isSuperAdmin: true,
    });

    expect(resolveTargetTenantId(request, "tenant_b")).toBe("tenant_b");
  });

  it("returns null when tenant is missing", () => {
    const request = createRequest({
      uid: "user_1",
      tenantId: "",
      claims: {},
      isSuperAdmin: false,
    });
    const reply = createReply();

    expect(requireTargetTenant(request, reply)).toBeNull();
    expect(reply.statusCode).toBe(403);
  });
});
