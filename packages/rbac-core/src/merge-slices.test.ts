import { describe, expect, it } from "vitest";

import { defineRbacSlice, mergeRbacSlices } from "./index.js";

const baseSlice = defineRbacSlice({
  id: "platform",
  permissions: ["platform.read", "platform.write"] as const,
  roles: {
    admin: {
      weight: 100,
      permissions: [],
      isSuperAdmin: true,
    },
    member: {
      weight: 10,
      permissions: ["platform.read"],
    },
  },
  roleLabels: {
    admin: "Admin",
    member: "Member",
  },
});

const billingSlice = defineRbacSlice({
  id: "billing",
  permissions: ["billing.invoice.read", "billing.invoice.create"] as const,
  roles: {
    billing_manager: {
      weight: 60,
      permissions: ["billing.invoice.read", "billing.invoice.create"],
    },
  },
});

describe("mergeRbacSlices", () => {
  it("merges permissions and roles from multiple slices", () => {
    const registry = mergeRbacSlices(baseSlice, billingSlice);

    expect(registry.permissions).toEqual([
      "platform.read",
      "platform.write",
      "billing.invoice.read",
      "billing.invoice.create",
    ]);
    expect(registry.isKnownRole("billing_manager")).toBe(true);
    expect(
      registry.hasPermission("billing_manager", "billing.invoice.create"),
    ).toBe(true);
  });

  it("grants superadmin all permissions", () => {
    const registry = mergeRbacSlices(baseSlice, billingSlice);

    expect(registry.hasPermission("admin", "billing.invoice.create")).toBe(
      true,
    );
  });

  it("throws when permissions collide across slices", () => {
    const other = defineRbacSlice({
      id: "other",
      permissions: ["platform.read"] as const,
      roles: {
        viewer: { weight: 5, permissions: [] },
      },
    });

    expect(() => mergeRbacSlices(baseSlice, other)).toThrow(
      /Permission "platform.read"/,
    );
  });

  it("throws when roles collide across slices", () => {
    const other = defineRbacSlice({
      id: "other",
      permissions: ["other.read"] as const,
      roles: {
        admin: { weight: 5, permissions: [] },
      },
    });

    expect(() => mergeRbacSlices(baseSlice, other)).toThrow(/Role "admin"/);
  });
});
