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
    tenantRoleNames: [],
    activeTenantName: null,
    tenantAppearance: null,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    selectTenant: vi.fn(),
    ...overrides,
  };
}

describe("usePermission", () => {
  it("returns true when permission is granted", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: ["widget.read"] }),
    );

    const { result } = renderHook(() => usePermission("widget.read"));
    expect(result.current).toBe(true);
  });

  it("returns false when permission is missing", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: ["widget.read"] }),
    );

    const { result } = renderHook(() => usePermission("widget.delete"));
    expect(result.current).toBe(false);
  });

  it("returns true for superadmin regardless of permissions", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: [], isSuperAdmin: true }),
    );

    const { result } = renderHook(() => usePermission("widget.delete"));
    expect(result.current).toBe(true);
  });

  it("matches expanded permissions from action wildcards", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({
        permissions: [
          "entityDefinition.read",
          "hook.read",
          "role.read",
          "tenantUser.read",
          "widget.read",
        ],
      }),
    );

    const { result } = renderHook(() => usePermission("widget.read"));
    expect(result.current).toBe(true);
  });

  it("matches entity wildcard grants in resolved permissions", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({
        permissions: [
          "widget.read",
          "widget.create",
          "widget.update",
          "widget.delete",
        ],
      }),
    );

    expect(renderHook(() => usePermission("widget.read")).result.current).toBe(
      true,
    );
    expect(
      renderHook(() => usePermission("widget.delete")).result.current,
    ).toBe(true);
  });

  it("does not treat unexpanded wildcard strings as granted permissions", () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuthContext({ permissions: ["widget.*"] }),
    );

    const { result } = renderHook(() => usePermission("widget.read"));
    expect(result.current).toBe(false);
  });
});
