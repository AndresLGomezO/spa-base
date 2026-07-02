import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { IndexProvisioningProcessList } from "./IndexProvisioningProcessList";

vi.mock("../../../lib/api-client", () => ({
  getTenantIndexProvisioningStatus: vi.fn(async () => ({
    phase: "error",
    isEnvironmentReady: false,
    collections: [],
    buildingCollections: [],
    errorCollections: ["accounts"],
    totalIndexes: 2,
    creatingCount: 0,
    readyCount: 1,
    errorCount: 1,
    requiresManualActionCount: 1,
    indexes: [
      {
        signature: "sig_ready",
        collection: "accounts",
        phase: "ready",
        requiresManualAction: false,
        log: [
          {
            timestamp: "2026-01-01T00:00:00.000Z",
            level: "success",
            event: "ready",
            message: "Index is ready",
          },
        ],
      },
      {
        signature: "sig_error",
        collection: "accounts",
        phase: "error",
        requiresManualAction: true,
        errorMessage: "Admin API failed",
        log: [
          {
            timestamp: "2026-01-02T00:00:00.000Z",
            level: "error",
            event: "error",
            message: "Index provisioning failed (manual action required)",
            detail: "Admin API failed",
          },
        ],
      },
    ],
  })),
}));

function renderProcessList(initialEntries = ["/debugger/index-provisioning"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <IndexProvisioningProcessList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("IndexProvisioningProcessList", () => {
  it("shows summary counts and failed filter from query param", async () => {
    renderProcessList(["/debugger/index-provisioning?filter=failed"]);

    expect(
      await screen.findByText(
        "2 indexes · 0 creating · 1 failed (manual action required)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2 ready")).toBeInTheDocument();
    expect(screen.getByText("Admin API failed")).toBeInTheDocument();
    expect(screen.queryByText("sig_ready")).not.toBeInTheDocument();
  });
});
