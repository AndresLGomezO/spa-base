import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hasPermission } from "@repo/rbac";

import {
  PermissionGuard,
  RedirectIfAuthenticated,
  RequireAuth,
  RequireTenant,
} from "./RouteGuards";

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

vi.mock("../components/platform/create-tenant-modal-context", () => ({
  useCreateTenantModal: () => ({
    open: false,
    openCreateTenantModal: vi.fn(),
    closeCreateTenantModal: vi.fn(),
  }),
}));

function LoginLocationProbe() {
  const location = useLocation();
  return (
    <div>
      Login page
      <span data-testid="login-search">{location.search}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe("RequireAuth", () => {
  it("redirects unauthenticated users to login with next param", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={["/app/widget?q=1"]}>
        <Routes>
          <Route
            path="/app/widget"
            element={
              <RequireAuth>
                <div>Protected</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginLocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    expect(screen.getByTestId("login-search")).toHaveTextContent(
      `?next=${encodeURIComponent("/app/widget?q=1")}`,
    );
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

describe("RedirectIfAuthenticated", () => {
  it("renders children when unauthenticated", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <div>Login page</div>
              </RedirectIfAuthenticated>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects authenticated users to the next path", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/login?next=${encodeURIComponent("/app/widget?q=1")}`,
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <div>Login page</div>
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/app/widget" element={<div>Widget page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Widget page")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects authenticated users to root when next is missing", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <div>Login page</div>
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects authenticated users to root when next is unsafe", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter
        initialEntries={[
          `/login?next=${encodeURIComponent("https://evil.example/app")}`,
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <div>Login page</div>
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});

describe("RequireTenant", () => {
  it("shows loading while auth session is still syncing", () => {
    mockUseAuth.mockReturnValue({
      isReady: false,
      isSessionResolved: false,
      tenantId: null,
      availableTenants: [],
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

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("tenant.noTenants")).not.toBeInTheDocument();
    expect(screen.queryByText("Tenant content")).not.toBeInTheDocument();
  });

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

  it("shows loading while superadmin auto-bind is pending", () => {
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
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Tenant content")).not.toBeInTheDocument();
  });

  it("shows empty state when user has no tenants", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: null,
      availableTenants: [],
      isSuperAdmin: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("tenant.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByText("Tenant content")).not.toBeInTheDocument();
  });

  it("shows member no-tenant message when not superadmin", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      tenantId: null,
      availableTenants: [],
      isSuperAdmin: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireTenant>
                <div>Tenant content</div>
              </RequireTenant>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("tenant.noTenants")).toBeInTheDocument();
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
