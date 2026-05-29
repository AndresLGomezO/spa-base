import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantManager } from "./TenantManager";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../lib/admin-client", () => ({
  listAdminTenants: vi.fn(),
  createAdminTenant: vi.fn(),
  updateAdminTenant: vi.fn(),
}));

import { listAdminTenants, updateAdminTenant } from "../../lib/admin-client";

describe("TenantManager", () => {
  beforeEach(() => {
    vi.mocked(listAdminTenants).mockResolvedValue([
      {
        id: "tenant_a",
        name: "Tenant A",
        status: "active",
        createdBy: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    vi.mocked(updateAdminTenant).mockResolvedValue({
      id: "tenant_a",
      name: "Tenant A",
      status: "suspended",
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("loads and displays tenants", async () => {
    const view = render(<TenantManager />);

    expect(
      await within(view.container).findByText("Tenant A"),
    ).toBeInTheDocument();
    expect(within(view.container).getByText("tenant_a")).toBeInTheDocument();
    expect(listAdminTenants).toHaveBeenCalled();
  });

  it("suspends an active tenant", async () => {
    const view = render(<TenantManager />);
    const scope = within(view.container);

    await scope.findByText("Tenant A");
    const suspendButton = view.container.querySelector("tbody button");
    expect(suspendButton).not.toBeNull();
    fireEvent.click(suspendButton!);

    await waitFor(() => {
      expect(updateAdminTenant).toHaveBeenCalledWith("tenant_a", {
        status: "suspended",
      });
    });
  });
});
