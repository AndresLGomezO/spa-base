import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { getJsonImportTextarea } from "../../test/admin-select-test-utils";
import { CustomViewsView } from "./CustomViewsView";

vi.mock("../../lib/api-client", () => ({
  isApiClientError: (error: unknown) => error instanceof Error,
  putCustomViewsCatalog: vi.fn(),
  listEntityQueryDefinitions: vi.fn(async () => ({ items: [] })),
  createCustomView: vi.fn(),
  patchCustomView: vi.fn(),
  deleteCustomView: vi.fn(),
}));

vi.mock("../../custom-views/custom-view-catalog-context", () => ({
  useCustomViewCatalog: () => ({
    items: [
      {
        id: "custom_view_1",
        tenantId: "tenant_a",
        viewId: "upcoming-payments",
        name: "Upcoming payments",
        sourceEntity: "transaction",
        entityQueryDefinitionId: "query_1",
        nav: { label: "Payments" },
        ui: {
          views: [{ type: "table", name: "default", fields: ["type"] }],
          listViewType: "expandableTable",
        },
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    refresh: vi.fn(async () => undefined),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../hooks/useEntityNavCategories", () => ({
  useEntityNavCategories: () => ({ data: [] }),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => true,
}));

import { putCustomViewsCatalog } from "../../lib/api-client";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-router", () => ({
  Link: ({ children }: { readonly children: React.ReactNode }) => children,
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

describe("CustomViewsView", () => {
  it("replaces the catalog after import confirmation", async () => {
    vi.mocked(putCustomViewsCatalog).mockResolvedValue({
      counts: { created: 0, updated: 1, deleted: 0 },
      items: [],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CustomViewsView canCreate canUpdate canDelete />
      </QueryClientProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "jsonActions.importAriaLabel" }),
    );
    fireEvent.change(getJsonImportTextarea(), {
      target: {
        value: JSON.stringify({
          kind: "custom-views-catalog",
          version: 1,
          exportedAt: new Date().toISOString(),
          customViews: [
            {
              name: "Upcoming payments",
              viewId: "upcoming-payments",
              entityQueryDefinitionName: "Upcoming payments",
              nav: { label: "Payments" },
              status: "ACTIVE",
            },
          ],
        }),
      },
    });

    fireEvent.click(screen.getByText("customViews.json.apply"));
    fireEvent.click(screen.getByText("customViews.json.catalog.confirmAction"));

    await waitFor(() => {
      expect(putCustomViewsCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
