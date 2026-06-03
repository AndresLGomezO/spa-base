import { describe, expect, it } from "vitest";

import { isRateLimitExemptRequest } from "./rate-limit-allowlist.js";

describe("isRateLimitExemptRequest", () => {
  it("exempts session validation and tenant selection", () => {
    expect(
      isRateLimitExemptRequest({
        method: "GET",
        url: "/auth/validate",
      } as never),
    ).toBe(true);
    expect(
      isRateLimitExemptRequest({
        method: "POST",
        url: "/auth/select-tenant",
      } as never),
    ).toBe(true);
  });

  it("exempts entity catalog and UI override saves", () => {
    expect(
      isRateLimitExemptRequest({
        method: "GET",
        url: "/api/entities",
      } as never),
    ).toBe(true);
    expect(
      isRateLimitExemptRequest({
        method: "PUT",
        url: "/api/entities/account/ui-override",
      } as never),
    ).toBe(true);
  });

  it("exempts entity file reads and layout static uploads", () => {
    expect(
      isRateLimitExemptRequest({
        method: "GET",
        url: "/api/entity-files/download-storage?entityName=account",
      } as never),
    ).toBe(true);
    expect(
      isRateLimitExemptRequest({
        method: "GET",
        url: "/api/entity-files/download",
      } as never),
    ).toBe(true);
    expect(
      isRateLimitExemptRequest({
        method: "POST",
        url: "/api/entity-files/upload",
      } as never),
    ).toBe(true);
  });

  it("does not exempt unrelated routes", () => {
    expect(
      isRateLimitExemptRequest({
        method: "GET",
        url: "/api/account",
      } as never),
    ).toBe(false);
  });
});
