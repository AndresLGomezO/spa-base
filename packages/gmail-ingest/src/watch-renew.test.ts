import { describe, expect, it } from "vitest";

import {
  computeGmailWatchRenewAt,
  normalizeGmailEmail,
  parseGmailWatchExpirationMs,
  shouldRenewGmailWatchSoon,
} from "./watch-renew.js";

describe("normalizeGmailEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeGmailEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("parseGmailWatchExpirationMs", () => {
  it("parses unix ms strings", () => {
    expect(parseGmailWatchExpirationMs("1700000000000")).toBe(1700000000000);
  });

  it("parses ISO timestamps", () => {
    expect(parseGmailWatchExpirationMs("2026-07-20T12:00:00.000Z")).toBe(
      Date.parse("2026-07-20T12:00:00.000Z"),
    );
  });
});

describe("computeGmailWatchRenewAt", () => {
  it("schedules ~24h before expiration and not in the past", () => {
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const renewAt = computeGmailWatchRenewAt(String(expiration));
    expect(renewAt.getTime()).toBeGreaterThan(Date.now());
    expect(renewAt.getTime()).toBeLessThan(expiration);
  });
});

describe("shouldRenewGmailWatchSoon", () => {
  it("returns true when missing expiration", () => {
    expect(shouldRenewGmailWatchSoon(null)).toBe(true);
  });

  it("returns true when expiring within window", () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(shouldRenewGmailWatchSoon(soon)).toBe(true);
  });

  it("returns false when far from expiration", () => {
    const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(shouldRenewGmailWatchSoon(later)).toBe(false);
  });
});
