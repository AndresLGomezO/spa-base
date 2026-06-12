import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { i18n } from "../../i18n";
import { useIndexProvisioningStatus } from "../../hooks/useIndexProvisioningStatus";
import type { EntityRecord } from "../../hooks/useEntity";
import type { ApiClientError } from "../../lib/api-client";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityTable } from "./EntityTable";

vi.mock("../../hooks/useEntityPermissions", () => ({
  useEntityPermissions: vi.fn(() => ({
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canShare: false,
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

vi.mock("../../hooks/useIndexProvisioningStatus", () => ({
  useIndexProvisioningStatus: vi.fn(),
}));

const mockUseIndexProvisioningStatus = vi.mocked(useIndexProvisioningStatus);

type EntityStateOverrides = Partial<{
  items: readonly EntityRecord[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  listError: ApiClientError | null;
}>;

type IndexStatusMock = ReturnType<typeof useIndexProvisioningStatus>;

function renderTable(
  entityStateOverrides: EntityStateOverrides = {},
  indexStatus: IndexStatusMock = {
    phase: "idle",
    isBlocking: false,
    isLoading: false,
    isFetching: false,
    summary: undefined,
    error: null,
    refresh: vi.fn(),
  },
) {
  mockUseIndexProvisioningStatus.mockReturnValue(indexStatus);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TestEntityCatalogProvider>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
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
                listError: null,
                ...entityStateOverrides,
              }}
            />
          </MemoryRouter>
        </I18nextProvider>
      </TestEntityCatalogProvider>
    </QueryClientProvider>,
  );
}

describe("EntityTable", () => {
  it("renders records for viewer permissions with view action only", () => {
    renderTable();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByLabelText("View")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
  });

  it("shows index building panel while model-driven indexes are building", () => {
    renderTable(
      {
        items: [],
        totalCount: 0,
        isLoading: false,
        error: "Firestore indexes for this entity are still building.",
        listError: Object.assign(
          new Error("Firestore indexes for this entity are still building."),
          {
            name: "ApiClientError",
            statusCode: 503,
            code: "INDEX_CREATING",
            fieldErrors: {},
          },
        ) as ApiClientError,
      },
      {
        phase: "building",
        isBlocking: true,
        isLoading: false,
        isFetching: false,
        summary: undefined,
        error: null,
        refresh: vi.fn(),
      },
    );

    expect(
      screen.getByLabelText("Preparing database indexes"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Setting up/i)).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  it("shows list error for COMPOSITE_INDEX_REQUIRED when indexes are not building", () => {
    const compositeIndexMessage =
      "A Firestore index is required for this query. Create it from the model or Firebase console.";

    renderTable({
      items: [],
      totalCount: 0,
      isLoading: false,
      error: compositeIndexMessage,
      listError: Object.assign(new Error(compositeIndexMessage), {
        name: "ApiClientError",
        statusCode: 503,
        code: "COMPOSITE_INDEX_REQUIRED",
        fieldErrors: {},
      }) as ApiClientError,
    });

    expect(screen.getByText(compositeIndexMessage)).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Preparing database indexes"),
    ).not.toBeInTheDocument();
  });
});
