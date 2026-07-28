import { fireEvent, render, screen } from "@testing-library/react";
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
    i18n: { language: "en" },
  }),
}));

const mockListWorkloads = vi.fn();
const mockGetWorkload = vi.fn();

vi.mock("../../lib/admin-client", () => ({
  listWorkloads: (...args: unknown[]) => mockListWorkloads(...args),
  getWorkload: (...args: unknown[]) => mockGetWorkload(...args),
  applyWorkloadAction: vi.fn(),
  listWorkloadRuns: vi.fn(async () => ({ items: [], nextCursor: null })),
  getWorkloadRun: vi.fn(),
  getWorkloadRunLogs: vi.fn(),
  getWorkloadRunTrace: vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPanel(initialEntry = "/platform/workloads") {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PlatformWorkloadsPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SAMPLE_WORKLOAD: WorkloadWithState = {
  id: "queue:ai-jobs",
  kind: "cloudTasksQueue",
  source: "system",
  domain: "ai",
  displayName: "AI Jobs Queue",
  description: "A test queue",
  actions: ["pause", "runNow"],
  state: {
    status: "ready",
    fetchedAt: "2025-01-01T00:00:00Z",
  },
};

const SAMPLE_SCHEDULER: WorkloadWithState = {
  id: "scheduler:nightly",
  kind: "schedulerJob",
  source: "system",
  domain: "ai",
  displayName: "Nightly AI",
  description: "Runs at 21:00",
  actions: ["pause", "resume", "runNow"],
  schedule: { cron: "0 21 * * *", timezone: "UTC" },
  state: {
    status: "running",
    fetchedAt: "2025-01-01T00:00:00Z",
  },
};

const SAMPLE_HANDLER: WorkloadWithState = {
  id: "worker:process-ai-chat",
  kind: "workerRoute",
  source: "system",
  domain: "ai",
  displayName: "Process AI Chat",
  description: "HTTP handler",
  actions: [],
  route: "/tasks/process-ai-chat",
  controlledBy: ["queue:ai-jobs"],
  state: {
    status: "unknown",
    fetchedAt: "2025-01-01T00:00:00Z",
  },
};

describe("PlatformWorkloadsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkload.mockResolvedValue({
      workload: SAMPLE_WORKLOAD,
      stats24h: {
        success: 1,
        error: 0,
        timeout: 0,
        running: 0,
        cancelled: 0,
      },
    });
  });

  it("renders empty state when no workloads", async () => {
    mockListWorkloads.mockResolvedValue([]);
    renderPanel();
    expect(
      await screen.findAllByText("platform.workloads.empty"),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders overview and catalog rows; keeps handlers out of ops tree", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD, SAMPLE_HANDLER]);
    renderPanel();
    expect(
      await screen.findByText("platform.workloads.overviewRow"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("platform.workloads.catalogRow"),
    ).toBeInTheDocument();
    expect(await screen.findByText("AI Jobs Queue")).toBeInTheDocument();
    expect(screen.queryByText("Process AI Chat")).not.toBeInTheDocument();
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("opens catalog view without Running status badges for handlers", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD, SAMPLE_HANDLER]);
    renderPanel();
    fireEvent.click(await screen.findByText("platform.workloads.catalogRow"));
    expect(
      await screen.findByText("platform.workloads.catalogTitle"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Process AI Chat")).toBeInTheDocument();
    expect(
      screen.getByText("platform.workloads.catalogHandlerBadge"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("platform.workloads.catalogSubtitle"),
    ).toBeInTheDocument();
  });

  it("filters by domain via URL", async () => {
    mockListWorkloads.mockResolvedValue([
      SAMPLE_WORKLOAD,
      {
        ...SAMPLE_WORKLOAD,
        id: "queue:gmail-jobs",
        domain: "email",
        displayName: "Gmail Jobs Queue",
      },
    ]);
    renderPanel("/platform/workloads?domain=ai");
    expect(await screen.findByText("AI Jobs Queue")).toBeInTheDocument();
    expect(screen.queryByText("Gmail Jobs Queue")).not.toBeInTheDocument();
  });

  it("filters by frequency and hour", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD, SAMPLE_SCHEDULER]);
    renderPanel("/platform/workloads?frequency=daily&hour=21");
    expect(await screen.findByText("Nightly AI")).toBeInTheDocument();
    expect(screen.queryByText("AI Jobs Queue")).not.toBeInTheDocument();
  });

  it("renders filter controls and summary overview", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD]);
    renderPanel();
    expect(
      await screen.findByPlaceholderText(
        "platform.workloads.searchPlaceholder",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("platform.workloads.summaryTitle"),
    ).toBeInTheDocument();
  });

  it("shows related handlers on parent detail without Running badge", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD, SAMPLE_HANDLER]);
    mockGetWorkload.mockResolvedValue({
      workload: SAMPLE_WORKLOAD,
      stats24h: {
        success: 1,
        error: 0,
        timeout: 0,
        running: 0,
        cancelled: 0,
      },
    });
    renderPanel("/platform/workloads?workload=queue:ai-jobs");
    expect(
      await screen.findByText("platform.workloads.relatedHandlers"),
    ).toBeInTheDocument();
    expect(screen.getByText("Process AI Chat")).toBeInTheDocument();
    expect(
      screen.getByText("platform.workloads.catalogHandlerBadge"),
    ).toBeInTheDocument();
  });

  it("shows detail panel when a workload is selected via URL", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD]);
    renderPanel("/platform/workloads?workload=queue:ai-jobs");
    expect(await screen.findByText("AI Jobs Queue")).toBeInTheDocument();
    expect(
      await screen.findByText("platform.workloads.tabOverview"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("selects a workload from the tree", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD]);
    renderPanel();
    const row = await screen.findByRole("treeitem");
    fireEvent.click(row);
    expect(
      await screen.findByText("platform.workloads.tabOverview"),
    ).toBeInTheDocument();
  });

  it("returns to catalog from a handler detail", async () => {
    mockListWorkloads.mockResolvedValue([SAMPLE_WORKLOAD, SAMPLE_HANDLER]);
    mockGetWorkload.mockResolvedValue({
      workload: SAMPLE_HANDLER,
    });
    renderPanel("/platform/workloads?workload=worker:process-ai-chat");
    expect(
      await screen.findByText("platform.workloads.backToCatalog"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("platform.workloads.backToCatalog"));
    expect(
      await screen.findByText("platform.workloads.catalogTitle"),
    ).toBeInTheDocument();
  });
});
