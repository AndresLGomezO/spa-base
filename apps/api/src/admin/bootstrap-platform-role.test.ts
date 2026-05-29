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
      parseBootstrapSuperAdminEmails(
        " Admin@Example.com,andreslgomezo@gmail.com ",
      ),
    ).toEqual(new Set(["admin@example.com", "andreslgomezo@gmail.com"]));
  });

  it("bootstraps only for newly created allowlisted users", () => {
    expect(
      shouldBootstrapSuperAdmin({
        email: "andreslgomezo@gmail.com",
        created: true,
        platformRole: null,
        allowlist: new Set(["andreslgomezo@gmail.com"]),
      }),
    ).toBe(true);

    expect(
      shouldBootstrapSuperAdmin({
        email: "andreslgomezo@gmail.com",
        created: false,
        platformRole: null,
        allowlist: new Set(["andreslgomezo@gmail.com"]),
      }),
    ).toBe(false);
  });

  it("assigns canonical platform superadmin role", () => {
    const bootstrapped = withBootstrapPlatformRole({
      uid: "user_1",
      email: "andreslgomezo@gmail.com",
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
