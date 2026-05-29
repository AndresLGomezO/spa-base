import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthContext } from "./AuthContext";
import { usePermission } from "./usePermission";

describe("usePermission", () => {
  it("returns true when the authenticated user has the permission", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext
        value={{
          user: {
            uid: "user_1",
            email: "demo@example.com",
            displayName: "Demo",
            photoURL: null,
            role: "admin",
            providerId: "google.com",
          },
          isAuthenticated: true,
          isReady: true,
          error: null,
          loginWithGoogle: async () => ({ success: true }),
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext>
    );

    const { result } = renderHook(() => usePermission("team:manage"), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });

  it("returns false when the user lacks the permission", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext
        value={{
          user: {
            uid: "user_1",
            email: "demo@example.com",
            displayName: "Demo",
            photoURL: null,
            role: "member",
            providerId: "google.com",
          },
          isAuthenticated: true,
          isReady: true,
          error: null,
          loginWithGoogle: async () => ({ success: true }),
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext>
    );

    const { result } = renderHook(() => usePermission("team:manage"), {
      wrapper,
    });
    expect(result.current).toBe(false);
  });
});
