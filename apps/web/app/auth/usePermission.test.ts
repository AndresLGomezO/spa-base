import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuthContextValue } from "./auth.types";
import { usePermission } from "./usePermission";

vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthContext";

function mockAuthContext(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    isAuthenticated: true,
    isReady: true,
    error: null,
    permissions: [],
    isSuperAdmin: false,
    tenantId: "tenant_a",
    availableTenants: ["tenant_a"],
    tenantOptions: [],
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    selectTenant: vi.fn(),
    ...overrides,
  };
}

describe("usePermission", () => {
  it("returns true when permission is granted", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: ["customer.read"] }),
    );

    const { result } = renderHook(() => usePermission("customer.read"));
    expect(result.current).toBe(true);
  });

  it("returns false when permission is missing", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: ["customer.read"] }),
    );

    const { result } = renderHook(() => usePermission("customer.delete"));
    expect(result.current).toBe(false);
  });

  it("returns true for superadmin regardless of permissions", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: [], isSuperAdmin: true }),
    );

    const { result } = renderHook(() => usePermission("customer.delete"));
    expect(result.current).toBe(true);
  });
});
