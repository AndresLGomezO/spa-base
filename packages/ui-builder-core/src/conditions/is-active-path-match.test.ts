import { describe, expect, it } from "vitest";

import { isActivePathMatch } from "./is-active-path-match.js";

describe("isActivePathMatch", () => {
  it("matches / exactly only", () => {
    expect(isActivePathMatch("/", "/")).toBe(true);
    expect(isActivePathMatch("/app", "/")).toBe(false);
    expect(isActivePathMatch("/app/", "/")).toBe(false);
  });

  it("matches exact paths", () => {
    expect(isActivePathMatch("/app/transactions", "/app/transactions")).toBe(
      true,
    );
    expect(isActivePathMatch("/app/other", "/app/transactions")).toBe(false);
  });

  it("matches subpaths", () => {
    expect(
      isActivePathMatch("/app/transactions/abc", "/app/transactions"),
    ).toBe(true);
    expect(
      isActivePathMatch("/app/transactions/x/y", "/app/transactions"),
    ).toBe(true);
  });

  it("does not match partial segment prefixes", () => {
    expect(
      isActivePathMatch("/app/transactions-extra", "/app/transactions"),
    ).toBe(false);
  });

  it("rejects empty match paths", () => {
    expect(isActivePathMatch("/app", "")).toBe(false);
    expect(isActivePathMatch("/app", "   ")).toBe(false);
  });
});
