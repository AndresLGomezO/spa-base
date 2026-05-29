import { describe, expect, it } from "vitest";

import {
  isBootstrapAdminEmail,
  resolveEffectiveUserRole,
  resolveInitialUserRole,
  resolveRoleFromTokenClaims,
  shouldSyncRoleClaims,
} from "./role-claims-sync.service.js";

describe("resolveRoleFromTokenClaims", () => {
  it("returns valid roles from claims", () => {
    expect(resolveRoleFromTokenClaims({ role: "admin" })).toBe("admin");
    expect(resolveRoleFromTokenClaims({ role: "member" })).toBe("member");
  });

  it("returns null for invalid claims", () => {
    expect(resolveRoleFromTokenClaims({ role: "unknown" })).toBeNull();
    expect(resolveRoleFromTokenClaims({})).toBeNull();
  });
});

describe("resolveEffectiveUserRole", () => {
  it("prefers firestore role when claims sync is newer than token", () => {
    const role = resolveEffectiveUserRole(
      "member",
      "admin",
      "2026-01-02T00:00:00.000Z",
      1704067200,
    );

    expect(role).toBe("admin");
  });

  it("falls back to token role when sync is older", () => {
    const role = resolveEffectiveUserRole(
      "admin",
      "member",
      "2024-01-01T00:00:00.000Z",
      1704153600,
    );

    expect(role).toBe("admin");
  });
});

describe("shouldSyncRoleClaims", () => {
  it("returns true when token role differs from firestore role", () => {
    expect(shouldSyncRoleClaims("admin", { role: "member" })).toBe(true);
  });

  it("returns false when roles match", () => {
    expect(shouldSyncRoleClaims("member", { role: "member" })).toBe(false);
  });
});

describe("bootstrap admin helpers", () => {
  it("detects bootstrap admin emails case-insensitively", () => {
    expect(
      isBootstrapAdminEmail("Admin@Example.com", ["admin@example.com"]),
    ).toBe(true);
    expect(
      isBootstrapAdminEmail("other@example.com", ["admin@example.com"]),
    ).toBe(false);
  });

  it("resolves initial role from bootstrap list", () => {
    expect(
      resolveInitialUserRole("admin@example.com", ["admin@example.com"]),
    ).toBe("admin");
    expect(
      resolveInitialUserRole("member@example.com", ["admin@example.com"]),
    ).toBe("member");
  });
});
