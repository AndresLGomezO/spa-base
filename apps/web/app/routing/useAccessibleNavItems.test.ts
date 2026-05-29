import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAccessibleNavItems } from "./useAccessibleNavItems";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("useAccessibleNavItems", () => {
  it("shows all entities for superadmin", () => {
    mockUseAuth.mockReturnValue({
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const entityIds = result.current
      .filter((item) => "to" in item && item.to.startsWith("/app/"))
      .map((item) => item.id);

    expect(entityIds).toEqual(["customer", "order"]);
  });

  it("filters entities by read permission for viewers", () => {
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: ["customer.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const entityIds = result.current
      .filter((item) => "to" in item && item.to.startsWith("/app/"))
      .map((item) => item.id);

    expect(entityIds).toEqual(["customer"]);
  });
});
