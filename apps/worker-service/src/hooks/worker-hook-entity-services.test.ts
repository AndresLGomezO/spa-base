import { describe, expect, it, vi } from "vitest";

import { buildTenantRoleCatalog } from "@repo/rbac";

import { resolveHookUserContext } from "./worker-hook-entity-services.js";

describe("resolveHookUserContext", () => {
  it("resolves tenant-scoped role grants for hook actions", async () => {
    const permissionDeps = {
      getUserAccessProfile: vi.fn(async () => ({
        platformRole: null,
        tenants: { tenant_test: ["normalUser"] },
      })),
      getRoleCatalog: vi.fn(async () =>
        buildTenantRoleCatalog([
          {
            id: "role_normal",
            tenantId: "tenant_test",
            name: "normalUser",
            grants: ["paymentSchedule.create", "paymentSchedule.read"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ]),
      ),
      invalidateUserAccessCache: vi.fn(),
    };

    const user = await resolveHookUserContext(
      "tenant_test",
      "test_user_1",
      permissionDeps,
      {
        getKnownPermissions: () => [
          "paymentSchedule.create",
          "paymentSchedule.read",
        ],
      },
    );

    expect(user.permissions).toContain("paymentSchedule.create");
    expect(user.permissions).toContain("paymentSchedule.read");
  });
});
