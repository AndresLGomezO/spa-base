import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IndexProvisioningTreeJobs,
  IndexProvisioningTreeScope,
} from "./IndexProvisioningTreePanel";

const mockSelectIndexJob = vi.fn();

vi.mock("../debugger-context", () => ({
  useDebugger: () => ({
    selectedIndexSignature: null,
    selectIndexJob: mockSelectIndexJob,
    timeRangeBounds: {
      sinceIso: "1970-01-01T00:00:00.000Z",
      untilIso: "2100-01-01T00:00:00.000Z",
    },
  }),
}));

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
            message: "Index ready",
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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderTreePanel(initialEntries = ["/debugger/index-provisioning"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <div>
          <IndexProvisioningTreeScope />
          <IndexProvisioningTreeJobs />
          <LocationDisplay />
        </div>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("IndexProvisioningTreePanel", () => {
  beforeEach(() => {
    mockSelectIndexJob.mockClear();
  });

  it("shows summary in scope and failed filter from query param", async () => {
    renderTreePanel(["/debugger/index-provisioning?filter=failed"]);

    expect(
      await screen.findByText(
        "2 indexes · 0 creating · 1 failed (manual action required)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2 ready")).toBeInTheDocument();
    expect(screen.getByText("Admin API failed")).toBeInTheDocument();
    expect(screen.queryByText("sig_ready")).not.toBeInTheDocument();
  });

  it("filters the job list when switching filter badges", async () => {
    renderTreePanel();

    expect(
      await screen.findByText(
        "2 indexes · 0 creating · 1 failed (manual action required)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("sig_ready")).toBeInTheDocument();
    expect(screen.getByText("sig_error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Failed" }));

    await waitFor(() => {
      expect(screen.queryByText("sig_ready")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Admin API failed")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("filter=failed");

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => {
      expect(screen.getByText("sig_ready")).toBeInTheDocument();
    });
    expect(screen.getByTestId("location")).not.toHaveTextContent("filter=");
  });
});
