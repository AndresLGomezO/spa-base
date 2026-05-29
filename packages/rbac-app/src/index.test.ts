import { describe, expect, it } from "vitest";

import { APP_RBAC, ROLE, hasPermission, isUserRole } from "./index.js";

describe("APP_RBAC", () => {
  it("merges base and example slices", () => {
    expect(APP_RBAC.isKnownRole("demo_viewer")).toBe(true);
    expect(hasPermission("demo_viewer", "example.report.read")).toBe(true);
  });

  it("grants admin all module permissions", () => {
    expect(hasPermission(ROLE.ADMIN, "example.report.export")).toBe(true);
    expect(hasPermission(ROLE.ADMIN, "user:view_all")).toBe(true);
    expect(hasPermission(ROLE.ADMIN, "role:assign")).toBe(true);
  });

  it("scopes member to platform permissions", () => {
    expect(hasPermission(ROLE.MEMBER, "user:view_self")).toBe(true);
    expect(hasPermission(ROLE.MEMBER, "team:view")).toBe(true);
    expect(hasPermission(ROLE.MEMBER, "user:view_all")).toBe(false);
    expect(hasPermission(ROLE.MEMBER, "role:assign")).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(isUserRole("")).toBe(false);
    expect(isUserRole("unknown")).toBe(false);
    expect(isUserRole("Admin")).toBe(false);
    expect(hasPermission("unknown", "user:view_self")).toBe(false);
  });
});
