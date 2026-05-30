import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import SelectTenantRoute from "./select-tenant";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("SelectTenantRoute", () => {
  it("redirects tenant members to home", () => {
    mockUseAuth.mockReturnValue({
      isReady: true,
      isSuperAdmin: false,
      availableTenants: ["tenant_a"],
      tenantOptions: [{ id: "tenant_a", name: "Tenant A" }],
      selectTenant: vi.fn(),
      tenantId: "tenant_a",
    });

    render(
      <MemoryRouter initialEntries={["/select-tenant"]}>
        <Routes>
          <Route path="/select-tenant" element={<SelectTenantRoute />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
