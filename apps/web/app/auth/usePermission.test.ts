import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePermission } from "./usePermission";

vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthContext";

describe("usePermission", () => {
  it("returns true when permission is granted", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: true,
      isReady: true,
      error: null,
      permissions: ["customer.read"],
      isSuperAdmin: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("customer.read"));
    expect(result.current).toBe(true);
  });

  it("returns false when permission is missing", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: true,
      isReady: true,
      error: null,
      permissions: ["customer.read"],
      isSuperAdmin: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("customer.delete"));
    expect(result.current).toBe(false);
  });

  it("returns true for superadmin regardless of permissions", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: true,
      isReady: true,
      error: null,
      permissions: [],
      isSuperAdmin: true,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("customer.delete"));
    expect(result.current).toBe(true);
  });
});
