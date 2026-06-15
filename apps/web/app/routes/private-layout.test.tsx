import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import PrivateLayoutRoute from "./private-layout";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    isAuthenticated: true,
    tenantId: "tenant_a",
    permissions: [],
    isSuperAdmin: false,
  }),
}));

vi.mock("../components/sidebar/AppSidebar", () => ({
  AppSidebar: () => <aside data-testid="sidebar" />,
  AppHeader: () => <header data-testid="header" />,
}));

vi.mock("../entities/entity-catalog-context", () => ({
  EntityCatalogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../theme/TenantBrandingProvider", () => ({
  TenantBrandingProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();
  return {
    ...actual,
    SidebarProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

describe("PrivateLayoutRoute", () => {
  it("uses a fixed viewport shell with scroll contained in the page outlet", () => {
    render(
      <MemoryRouter initialEntries={["/settings/users"]}>
        <PrivateLayoutRoute />
      </MemoryRouter>,
    );

    const shell = screen.getByTestId("sidebar").parentElement;
    expect(shell).toHaveClass("h-dvh", "overflow-hidden");

    const main = screen.getByRole("main");
    expect(main).toHaveClass(
      "min-h-0",
      "min-w-0",
      "w-full",
      "max-w-none",
      "flex-1",
      "overflow-hidden",
    );

    const pageScroll = main.firstElementChild;
    expect(pageScroll).toHaveClass(
      "min-h-0",
      "min-w-0",
      "flex-1",
      "overflow-hidden",
    );
    expect(pageScroll).not.toHaveClass("overflow-y-auto");
  });

  it("allows vertical scrolling in the home dashboard outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PrivateLayoutRoute />
      </MemoryRouter>,
    );

    const pageScroll = screen.getByRole("main").firstElementChild;
    expect(pageScroll).toHaveClass(
      "min-h-0",
      "min-w-0",
      "flex-1",
      "w-full",
      "overflow-y-auto",
    );
    expect(pageScroll).not.toHaveClass("overflow-hidden");
  });
});
