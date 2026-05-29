import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminOverview } from "./AdminOverview";

const mockUseAuth = vi.fn();
const mockListEntityDefinitions = vi.fn();
const mockListRoles = vi.fn();
const mockListHooks = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: [{ name: "organization" }, { name: "project" }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("../../lib/api-client", () => ({
  listEntityDefinitions: (...args: unknown[]) =>
    mockListEntityDefinitions(...args),
  listRoles: (...args: unknown[]) => mockListRoles(...args),
  listHooks: (...args: unknown[]) => mockListHooks(...args),
}));

const mockT = (key: string) => key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

describe("AdminOverview", () => {
  it("renders counts and quick links for tenant admins", async () => {
    mockUseAuth.mockReturnValue({
      tenantId: "tenant_a",
      permissions: ["entityDefinition.read", "role.read", "hook.read"],
      isSuperAdmin: false,
    });
    mockListEntityDefinitions.mockResolvedValue({ items: [{ id: "1" }] });
    mockListRoles.mockResolvedValue({ items: [{ id: "r1" }, { id: "r2" }] });
    mockListHooks.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <AdminOverview />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("home.manageDataModels")).toBeInTheDocument();
    });
    expect(screen.getByText("home.rolesCount")).toBeInTheDocument();
    expect(screen.getByText("home.manageHooks")).toBeInTheDocument();
    expect(screen.getByText("home.manageRoles")).toBeInTheDocument();
  });
});
