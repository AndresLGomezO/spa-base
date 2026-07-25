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

vi.mock("../components/sidebar/NavMain", () => ({
  NavigationProgressBar: () => null,
}));

vi.mock("../entities/entity-catalog-context", () => ({
  EntityCatalogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useEntityCatalog: () => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("../custom-views/custom-view-catalog-context", () => ({
  CustomViewCatalogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useCustomViewCatalog: () => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getByViewId: vi.fn(),
  }),
}));

vi.mock("../routing/page-title-context", () => ({
  PageTitleProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../routing/nav-items-context", () => ({
  NavItemsProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../routing/NavigationPendingOutlet", () => ({
  NavigationPendingOutlet: () => (
    <div data-testid="navigation-pending-outlet" />
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

vi.mock(
  "../components/index-provisioning/IndexProvisioningGlobalBanner",
  () => ({
    IndexProvisioningGlobalBanner: () => (
      <div data-testid="index-provisioning-global-banner" />
    ),
  }),
);

vi.mock("../features/ai-chat", () => ({
  AiChatFab: () => null,
}));

describe("PrivateLayoutRoute", () => {
  it("uses a fixed viewport shell with scroll contained in the page outlet", () => {
    render(
      <MemoryRouter initialEntries={["/settings/users"]}>
        <PrivateLayoutRoute />
      </MemoryRouter>,
    );

    const shell = screen.getByTestId("sidebar").parentElement;
    expect(shell).toHaveClass(
      "fixed",
      "inset-0",
      "overflow-hidden",
      "bg-background",
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass(
      "min-h-0",
      "min-w-0",
      "w-full",
      "max-w-none",
      "flex-1",
      "overflow-hidden",
    );
    expect(main).not.toHaveClass("pb-[env(safe-area-inset-bottom)]");

    const pageScroll = main.firstElementChild;
    expect(pageScroll).toHaveClass(
      "min-h-0",
      "min-w-0",
      "flex-1",
      "overflow-y-auto",
      "overflow-x-hidden",
    );
    expect(pageScroll).not.toHaveClass("overflow-hidden");
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
      "overflow-x-hidden",
    );
    expect(pageScroll).not.toHaveClass("overflow-hidden");
  });
});
