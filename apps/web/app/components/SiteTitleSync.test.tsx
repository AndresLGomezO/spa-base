import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../auth/AuthContext";
import type { AuthContextValue } from "../auth/auth.types";

import {
  composeDocumentTitle,
  DEFAULT_SITE_NAME,
  SiteTitleSync,
} from "./SiteTitleSync";

const mockUsePageTitleFromNav = vi.fn<() => string | null>(() => null);

vi.mock("../routing/page-title-context", () => ({
  usePageTitleFromNav: () => mockUsePageTitleFromNav(),
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/app/accounts" }),
  };
});

function createAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    isAuthenticated: true,
    isReady: true,
    isSessionResolved: true,
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

function renderSiteTitleSync(pageTitleFromNav: string | null = null) {
  mockUsePageTitleFromNav.mockReturnValue(pageTitleFromNav);

  return render(
    <AuthContext.Provider value={createAuthValue()}>
      <SiteTitleSync />
    </AuthContext.Provider>,
  );
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

describe("SiteTitleSync", () => {
  it("sets document title to tenant name", () => {
    renderSiteTitleSync();

    expect(document.title).toBe("Acme Corp");
  });

  it("sets document title using nav page title when available", () => {
    renderSiteTitleSync("Accounts");

    expect(document.title).toBe("Accounts · Acme Corp");
  });

  it("falls back to default site name when tenant name is unavailable", () => {
    mockUsePageTitleFromNav.mockReturnValue(null);

    render(
      <AuthContext.Provider
        value={createAuthValue({ activeTenantName: null, tenantId: null })}
      >
        <SiteTitleSync />
      </AuthContext.Provider>,
    );

    expect(document.title).toBe(DEFAULT_SITE_NAME);
  });
});
