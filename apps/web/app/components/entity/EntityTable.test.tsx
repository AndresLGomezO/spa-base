import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityTable } from "./EntityTable";

vi.mock("../../hooks/useEntityPermissions", () => ({
  useEntityPermissions: vi.fn(() => ({
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canReadAll: false,
    canWriteAll: false,
    canDeleteAll: false,
    canManageShares: false,
  })),
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "test_user" },
    isAuthenticated: true,
    permissions: [],
    isSuperAdmin: false,
  })),
}));

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TestEntityCatalogProvider>
        <I18nextProvider i18n={i18n}>
          <EntityTable
            entityName="widget"
            page={1}
            onPageChange={vi.fn()}
            entityState={{
              items: [
                {
                  id: "org_1",
                  tenantId: "tenant_a",
                  createdAt: "2024-01-01T00:00:00.000Z",
                  updatedAt: "2024-01-01T00:00:00.000Z",
                  name: "Jane Doe",
                  email: "jane@example.com",
                  isActive: true,
                },
              ],
              totalCount: 1,
              isLoading: false,
              error: null,
            }}
          />
        </I18nextProvider>
      </TestEntityCatalogProvider>
    </QueryClientProvider>,
  );
}

describe("EntityTable", () => {
  it("renders records for viewer permissions without actions", () => {
    renderTable();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
  });
});
