import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hasPermission } from "@repo/rbac";

import { PermissionGuard, RequireAuth, RequireTenant } from "./RouteGuards";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../auth/usePermission", () => ({
  usePermission: (permission: string) => {
    const auth = mockUseAuth();
    return hasPermission(permission, auth.permissions ?? [], {
      isSuperAdmin: auth.isSuperAdmin,
    });
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("RequireAuth", () => {
  it("redirects unauthenticated users to login", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireAuth>
                <div>Protected</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireAuth>
                <div>Protected</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});

describe("RequireTenant", () => {
  it("shows loading while tenant member auto-bind is pending", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: null,
      availableTenants: ["tenant_a"],
      isSuperAdmin: false,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
          <Route path="/select-tenant" element={<div>Select tenant</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Select tenant")).not.toBeInTheDocument();
    expect(screen.queryByText("Tenant content")).not.toBeInTheDocument();
  });

  it("renders children when tenant is selected", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: "tenant_a",
      availableTenants: ["tenant_a"],
      isSuperAdmin: false,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Tenant content")).toBeInTheDocument();
  });

  it("allows superadmin without tenants to access platform routes", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: null,
      availableTenants: [],
      isSuperAdmin: true,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Tenant content")).toBeInTheDocument();
  });

  it("redirects superadmin with available tenants to select-tenant", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: null,
      availableTenants: ["tenant_a"],
      isSuperAdmin: true,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
          <Route path="/select-tenant" element={<div>Select tenant</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Select tenant")).toBeInTheDocument();
    expect(screen.queryByText("Tenant content")).not.toBeInTheDocument();
  });
});

describe("PermissionGuard", () => {
  it("blocks users without permission", () => {
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: [],
    });

    render(
      <MemoryRouter>
        <PermissionGuard permission="widget.read">
          <div>Entity page</div>
        </PermissionGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("entity.forbidden")).toBeInTheDocument();
    expect(screen.queryByText("Entity page")).not.toBeInTheDocument();
  });

  it("allows users with permission", () => {
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: ["widget.read"],
    });

    render(
      <MemoryRouter>
        <PermissionGuard permission="widget.read">
          <div>Entity page</div>
        </PermissionGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Entity page")).toBeInTheDocument();
  });
});
