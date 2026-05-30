import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../auth/AuthContext";
import type { AuthContextValue } from "../auth/auth.types";

import {
  composeDocumentTitle,
  DEFAULT_SITE_NAME,
  getPageTitleFromMatches,
  SiteTitleSync,
} from "./SiteTitleSync";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useMatches: () => [],
  };
});

function createAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    isAuthenticated: true,
    isReady: true,
    error: null,
    tenantId: "tenant_1",
    availableTenants: [],
    tenantOptions: [],
    permissions: [],
    isSuperAdmin: false,
    tenantRoleNames: [],
    activeTenantName: "Acme Corp",
    tenantAppearance: null,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    selectTenant: vi.fn(),
    ...overrides,
  };
}

describe("composeDocumentTitle", () => {
  it("uses tenant name alone when no page title is present", () => {
    expect(composeDocumentTitle(null, "Acme Corp")).toBe("Acme Corp");
  });

  it("combines page title and tenant name", () => {
    expect(composeDocumentTitle("Home", "Acme Corp")).toBe("Home · Acme Corp");
  });

  it("avoids duplicating the site name when page title matches", () => {
    expect(composeDocumentTitle("Acme Corp", "Acme Corp")).toBe("Acme Corp");
  });
});

describe("getPageTitleFromMatches", () => {
  it("returns the deepest route title", () => {
    expect(
      getPageTitleFromMatches([
        { meta: [{ title: "Project Base" }] },
        { meta: [{ title: "Home" }] },
      ] as never),
    ).toBe("Home");
  });
});

describe("SiteTitleSync", () => {
  it("sets document title to tenant name", async () => {
    render(
      <AuthContext.Provider value={createAuthValue()}>
        <SiteTitleSync />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Acme Corp");
    });
  });

  it("falls back to default site name when tenant name is unavailable", async () => {
    render(
      <AuthContext.Provider
        value={createAuthValue({ activeTenantName: null, tenantId: null })}
      >
        <SiteTitleSync />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(document.title).toBe(DEFAULT_SITE_NAME);
    });
  });
});
