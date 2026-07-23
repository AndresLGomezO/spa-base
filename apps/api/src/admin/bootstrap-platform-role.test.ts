import { describe, expect, it } from "vitest";

import { PLATFORM_SUPERADMIN } from "@repo/rbac";

import {
  parseBootstrapSuperAdminEmails,
  shouldBootstrapSuperAdmin,
  withBootstrapPlatformRole,
} from "./bootstrap-platform-role.js";

describe("bootstrap platform role", () => {
  it("parses comma-separated bootstrap emails", () => {
    expect(
      parseBootstrapSuperAdminEmails(" Admin@Example.com,owner@example.com "),
    ).toEqual(new Set(["admin@example.com", "owner@example.com"]));
  });

  it("bootstraps only for newly created allowlisted users", () => {
    expect(
      shouldBootstrapSuperAdmin({
        email: "owner@example.com",
        created: true,
        platformRole: null,
        allowlist: new Set(["owner@example.com"]),
      }),
    ).toBe(true);

    expect(
      shouldBootstrapSuperAdmin({
        email: "owner@example.com",
        created: false,
        platformRole: null,
        allowlist: new Set(["owner@example.com"]),
      }),
    ).toBe(false);
  });

  it("assigns canonical platform superadmin role", () => {
    const bootstrapped = withBootstrapPlatformRole({
      uid: "user_1",
      email: "owner@example.com",
      emailVerified: true,
      displayName: null,
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      providers: [],
      authCreatedAt: null,
      authLastSignInAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(bootstrapped.platformRole).toBe(PLATFORM_SUPERADMIN);
    expect(bootstrapped.tenants).toEqual({});
  });
});
