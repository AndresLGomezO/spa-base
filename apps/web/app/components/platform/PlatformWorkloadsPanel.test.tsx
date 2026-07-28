import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { PlatformWorkloadsPanel } from "./PlatformWorkloadsPanel";
import type { WorkloadWithState } from "../../lib/admin-client";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key} ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockListWorkloads = vi.fn();

vi.mock("../../lib/admin-client", () => ({
  listWorkloads: (...args: unknown[]) => mockListWorkloads(...args),
  applyWorkloadAction: vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPanel() {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlatformWorkloadsPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SAMPLE_WORKLOAD: WorkloadWithState = {
  id: "wl-1",
  kind: "cloudTasksQueue",
  source: "system",
  displayName: "Test Workload",
  description: "A test workload",
  actions: ["pause", "runNow"],
  state: {
    status: "running",
    fetchedAt: "2025-01-01T00:00:00Z",
  },
};

describe("PlatformWorkloadsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no workloads", async () => {
    mockListWorkloads.mockResolvedValue([]);
    renderPanel();
    expect(
      await screen.findByText("platform.workloads.empty"),
    ).toBeInTheDocument();
  });

  it("renders workload rows", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD]);
    renderPanel();
    expect(await screen.findByText("Test Workload")).toBeInTheDocument();
    expect(screen.getByText("A test workload")).toBeInTheDocument();
  });

  it("renders filter controls", async () => {
    mockListWorkloads.mockResolvedValue([]);
    renderPanel();
    expect(
      await screen.findByPlaceholderText(
        "platform.workloads.searchPlaceholder",
      ),
    ).toBeInTheDocument();
  });
});
