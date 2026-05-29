import { describe, expect, it } from "vitest";
import { mergeRbacSlices } from "@repo/rbac-core";

import { PLATFORM_ROLE, baseRbacSlice } from "./slice.js";

describe("baseRbacSlice", () => {
  it("defines platform admin and member roles", () => {
    const registry = mergeRbacSlices(baseRbacSlice);

    expect(registry.isKnownRole(PLATFORM_ROLE.ADMIN)).toBe(true);
    expect(registry.isKnownRole(PLATFORM_ROLE.MEMBER)).toBe(true);
    expect(registry.hasPermission(PLATFORM_ROLE.ADMIN, "role:assign")).toBe(
      true,
    );
    expect(registry.hasPermission(PLATFORM_ROLE.MEMBER, "role:assign")).toBe(
      false,
    );
  });
});
