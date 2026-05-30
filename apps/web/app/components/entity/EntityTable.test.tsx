import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityTable } from "./EntityTable";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 48,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 48,
        size: 48,
      })),
  }),
}));

vi.mock("../../hooks/useEntityPermissions", () => ({
  useEntityPermissions: vi.fn(() => ({
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  })),
}));

function renderTable() {
  return render(
    <TestEntityCatalogProvider>
      <I18nextProvider i18n={i18n}>
        <EntityTable
          entityName="widget"
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
            isLoading: false,
            error: null,
            nextCursor: null,
            isLoadingMore: false,
            loadMore: vi.fn(),
          }}
          onQueryConfigChange={vi.fn()}
        />
      </I18nextProvider>
    </TestEntityCatalogProvider>,
  );
}

describe("EntityTable", () => {
  it("renders records for viewer permissions without actions", () => {
    renderTable();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
