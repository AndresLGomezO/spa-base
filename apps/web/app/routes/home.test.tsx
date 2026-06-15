import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomePage } from "./home-page";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("../lib/api-client", () => ({
  getTenantDashboardLayout: vi.fn().mockResolvedValue({
    config: {
      tenantId: "tenant-1",
      dashboardSections: [],
      dashboardLayout: {
        showActions: true,
        root: {
          type: "root",
          id: "root-1",
          columnCount: 1,
          columns: [
            {
              id: "col-1",
              rows: [
                {
                  type: "component",
                  id: "row-1",
                  component: {
                    kind: "text",
                    primary: { type: "static", value: "Welcome" },
                  },
                },
              ],
            },
          ],
        },
      },
      updatedAt: new Date().toISOString(),
    },
  }),
}));

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

describe("HomePage", () => {
  it("renders the tenant dashboard content", async () => {
    renderHomePage();

    expect(await screen.findByText("Welcome")).toBeInTheDocument();
  });
});
