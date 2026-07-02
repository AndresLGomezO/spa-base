import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IndexProvisioningGlobalBanner } from "./IndexProvisioningGlobalBanner";

const mockUseTenantIndexReadiness = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../hooks/useTenantIndexReadiness", () => ({
  useTenantIndexReadiness: (enabled?: boolean) =>
    mockUseTenantIndexReadiness(enabled),
}));

describe("IndexProvisioningGlobalBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({ tenantId: "tenant_a" });
    mockUseTenantIndexReadiness.mockReturnValue({
      phase: "building",
      buildingCollections: ["financialItem", "loanDetails"],
      errorCollections: [],
      totalCreatingCount: 3,
      isEnvironmentReady: false,
      collections: [],
      isLoading: false,
      isError: false,
    });
  });

  it("renders nothing when indexes are ready", () => {
    mockUseTenantIndexReadiness.mockReturnValue({
      phase: "ready",
      buildingCollections: [],
      errorCollections: [],
      totalCreatingCount: 0,
      isEnvironmentReady: true,
      collections: [],
      isLoading: false,
      isError: false,
    });

    const { container } = render(
      <MemoryRouter>
        <IndexProvisioningGlobalBanner />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows expanded building banner with progress and debugger link", () => {
    render(
      <MemoryRouter>
        <IndexProvisioningGlobalBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText("Indexes are building")).toBeInTheDocument();
    expect(
      screen.getByText(
        "3 indexes building across 2 collections (financialItem, loanDetails)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Debugger" })).toHaveAttribute(
      "href",
      "/debugger/index-provisioning",
    );
  });

  it("minimizes to a compact row and expands again", () => {
    render(
      <MemoryRouter>
        <IndexProvisioningGlobalBanner />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Minimize banner" }));

    expect(
      screen.queryByText(
        "3 indexes building across 2 collections (financialItem, loanDetails)",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Indexes are building")).toBeInTheDocument();
    expect(sessionStorage.getItem("index-provisioning-banner-minimized")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand banner" }));

    expect(
      screen.getByText(
        "3 indexes building across 2 collections (financialItem, loanDetails)",
      ),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("index-provisioning-banner-minimized")).toBe(
      "false",
    );
  });
});
