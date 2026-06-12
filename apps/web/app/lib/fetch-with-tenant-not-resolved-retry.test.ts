import { beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn(async () => "refreshed-token");
const currentUser = { getIdToken };

vi.mock("./firebase", () => ({
  auth: {
    get currentUser() {
      return currentUser;
    },
  },
}));

import { fetchWithTenantNotResolvedRetry } from "./fetch-with-tenant-not-resolved-retry";

function createTenantNotResolvedError(): Error {
  const error = new Error("Tenant context is required.") as Error & {
    name: string;
    code: string;
    fieldErrors: Record<string, string>;
  };
  error.name = "ApiClientError";
  error.code = "TENANT_NOT_RESOLVED";
  error.fieldErrors = {};
  return error;
}

describe("fetchWithTenantNotResolvedRetry", () => {
  beforeEach(() => {
    getIdToken.mockClear();
  });

  it("returns the result when the first attempt succeeds", async () => {
    const fetchFn = vi.fn(async () => ({ items: [] }));

    await expect(fetchWithTenantNotResolvedRetry(fetchFn)).resolves.toEqual({
      items: [],
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it("refreshes the token and retries once on TENANT_NOT_RESOLVED", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(createTenantNotResolvedError())
      .mockResolvedValueOnce({ items: [{ name: "widget" }] });

    await expect(fetchWithTenantNotResolvedRetry(fetchFn)).resolves.toEqual({
      items: [{ name: "widget" }],
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenCalledWith(true);
  });

  it("rethrows non-tenant errors without retrying", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("Network failure");
    });

    await expect(fetchWithTenantNotResolvedRetry(fetchFn)).rejects.toThrow(
      "Network failure",
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getIdToken).not.toHaveBeenCalled();
  });
});
