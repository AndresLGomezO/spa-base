import { describe, expect, it } from "vitest";

import { AUTH_INITIAL_STATE, authReducer } from "./auth.machine";

describe("authReducer sessionResolved", () => {
  it("keeps session unresolved after early authenticated dispatch", () => {
    const state = authReducer(AUTH_INITIAL_STATE, {
      type: "AUTH_STATE_AUTHENTICATED",
      user: {
        uid: "user_1",
        email: "user@example.com",
        displayName: "User",
        photoURL: null,
        role: "member",
        providerId: "google.com",
      },
      sessionResolved: false,
    });

    expect(state.phase).toBe("authenticated");
    expect(state.sessionResolved).toBe(false);
    expect(state.tenantId).toBeNull();
  });

  it("marks session resolved after sync completes", () => {
    const authenticated = authReducer(AUTH_INITIAL_STATE, {
      type: "AUTH_STATE_AUTHENTICATED",
      user: {
        uid: "user_1",
        email: "user@example.com",
        displayName: "User",
        photoURL: null,
        role: "member",
        providerId: "google.com",
      },
      sessionResolved: false,
    });

    const resolved = authReducer(authenticated, {
      type: "AUTH_STATE_AUTHENTICATED",
      user: authenticated.user!,
      sessionResolved: true,
      tenantId: "tenant_a",
      availableTenants: ["tenant_a"],
    });

    expect(resolved.sessionResolved).toBe(true);
    expect(resolved.tenantId).toBe("tenant_a");
  });
});
