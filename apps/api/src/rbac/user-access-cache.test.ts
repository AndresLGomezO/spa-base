import { describe, expect, it, vi } from "vitest";

import { createUserAccessCache } from "./user-access-cache.js";

describe("createUserAccessCache", () => {
  it("caches profiles until invalidated", async () => {
    const getByUid = vi.fn(async () => ({
      uid: "user_1",
      email: "user@example.com",
      displayName: "User",
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }));

    const cache = createUserAccessCache({ getByUid } as never, {
      ttlMs: 60_000,
    });

    const first = await cache.getUserAccessProfile("user_1");
    const second = await cache.getUserAccessProfile("user_1");

    expect(getByUid).toHaveBeenCalledTimes(1);
    expect(first?.tenants?.tenant_a).toEqual(["admin"]);
    expect(second?.tenants?.tenant_a).toEqual(["admin"]);

    cache.invalidate("user_1");
    await cache.getUserAccessProfile("user_1");
    expect(getByUid).toHaveBeenCalledTimes(2);
  });
});
