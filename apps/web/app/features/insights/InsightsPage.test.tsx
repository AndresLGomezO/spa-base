import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InsightsPage } from "./InsightsPage";

const getInsightSurfaces = vi.fn();
const getInsights = vi.fn();
const refreshInsights = vi.fn();
const notifyAiSpendLimit = vi.fn();
let spendBlocked = false;
let canRun = true;

vi.mock("../../lib/api-client", () => ({
  getInsightSurfaces: (...args: unknown[]) => getInsightSurfaces(...args),
  getInsights: (...args: unknown[]) => getInsights(...args),
  refreshInsights: (...args: unknown[]) => refreshInsights(...args),
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "tenant-1",
  }),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => canRun,
}));

vi.mock("../ai-spend/use-ai-spend-action-guard", () => ({
  useAiSpendActionGuard: () => ({
    blocked: spendBlocked,
    softWarn: false,
    beforeAiAction: () => {
      if (spendBlocked) {
        notifyAiSpendLimit("blocked");
        return false;
      }
      return true;
    },
    handleAiActionError: () => false,
    assertAiNotBlocked: () => !spendBlocked,
    refreshSpendStatus: vi.fn(),
  }),
}));

vi.mock("../ai-spend/notify-ai-spend-limit", () => ({
  notifyAiSpendLimit: (...args: unknown[]) => notifyAiSpendLimit(...args),
  notifyAiSpendLimitFromError: () => false,
}));

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

const spendingSurface = {
  id: "spending",
  permission: "ai.chat.run",
  labels: {
    title: "Spending insights",
    description: "Ranked spending insights.",
    emptyScope: "No spending insights for this month yet.",
    seeAll: "See all",
    refreshAction: "Refresh insights",
    portfolioNarrativeTitle: "Portfolio spending narrative",
    summary: {
      totalIncome: "Total income",
      totalExpenses: "Total expenses",
      netCashflow: "Net cashflow",
    },
  },
  ui: { showInHome: true, homeOrder: 1, tabOrder: 1 },
  scope: { field: "month", queryParam: "month", format: "YYYY-MM" as const },
  linkFields: [{ field: "categoryId", entity: "category" }],
  summaryFields: [
    {
      path: "totalIncome",
      labelKey: "totalIncome",
      format: "currency" as const,
    },
    {
      path: "totalExpenses",
      labelKey: "totalExpenses",
      format: "currency" as const,
    },
    {
      path: "netCashflow",
      labelKey: "netCashflow",
      format: "currency" as const,
    },
  ],
};

const paymentsSurface = {
  id: "payments",
  permission: "ai.chat.run",
  labels: {
    title: "Upcoming payment insights",
    emptyScope: "No upcoming payment insights for this window yet.",
    refreshAction: "Refresh insights",
    portfolioNarrativeTitle: "Portfolio payments narrative",
    summary: {
      dueNext7d: "Due in 7 days",
      dueNext30d: "Due in 30 days",
    },
  },
  ui: { showInHome: true, homeOrder: 2, tabOrder: 2 },
  scope: { field: "window", queryParam: "window", format: "YYYY-MM" as const },
  linkFields: [{ field: "financialItemId", entity: "financialItem" }],
  summaryFields: [
    { path: "dueNext7d", labelKey: "dueNext7d", format: "currency" as const },
    { path: "dueNext30d", labelKey: "dueNext30d", format: "currency" as const },
  ],
};

function renderPage(initialUrl = "/ai/insights?month=2026-07") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/ai/insights" element={<InsightsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InsightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spendBlocked = false;
    canRun = true;
    getInsightSurfaces.mockResolvedValue({
      surfaces: [spendingSurface, paymentsSurface],
    });
    getInsights.mockImplementation(async (surfaceId: string) => {
      if (surfaceId === "payments") {
        return {
          surfaceId: "payments",
          scope: "2026-07",
          currency: "USD",
          summary: { dueNext7d: 400, dueNext30d: 1200 },
          insights: [
            {
              recordId: "upi_1",
              title: "Rent due soon",
              rank: 1,
              impactScore: 0.95,
              links: { financialItemId: "fi_rent" },
              narrative: "Rent payment is approaching.",
            },
          ],
          portfolioNarrative: "Several obligations cluster mid-month.",
          labels: paymentsSurface.labels,
          ui: paymentsSurface.ui,
          scopeConfig: paymentsSurface.scope,
          summaryFields: paymentsSurface.summaryFields,
          linkFields: paymentsSurface.linkFields,
        };
      }
      return {
        surfaceId: "spending",
        scope: "2026-07",
        currency: "USD",
        summary: {
          totalIncome: 5000,
          totalExpenses: 3200,
          netCashflow: 1800,
        },
        insights: [
          {
            recordId: "sci_1",
            title: "Dining elevated",
            rank: 1,
            impactScore: 0.9,
            links: { categoryId: "cat_dining" },
            narrative: "Dining spend is elevated.",
          },
        ],
        portfolioNarrative: "Mix leans essential.",
        labels: spendingSurface.labels,
        ui: spendingSurface.ui,
        scopeConfig: spendingSurface.scope,
        summaryFields: spendingSurface.summaryFields,
        linkFields: spendingSurface.linkFields,
      };
    });
    refreshInsights.mockResolvedValue({
      surfaceId: "spending",
      scope: "2026-07",
      enqueued: 1,
      alreadyCurrent: 0,
    });
  });

  it("loads insights for the default tab and scope from the URL", async () => {
    renderPage();

    await waitFor(() => {
      expect(getInsightSurfaces).toHaveBeenCalled();
      expect(getInsights).toHaveBeenCalledWith(
        "spending",
        "2026-07",
        expect.any(String),
      );
    });
    expect(await screen.findByText("Dining elevated")).toBeInTheDocument();
    expect(screen.getByText("Mix leans essential.")).toBeInTheDocument();
    expect(screen.getByText("cat_dining")).toBeInTheDocument();
  });

  it("loads payment insights for tab=payments and window from the URL", async () => {
    renderPage("/ai/insights?tab=payments&window=2026-07");

    await waitFor(() => {
      expect(getInsights).toHaveBeenCalledWith(
        "payments",
        "2026-07",
        expect.any(String),
      );
    });
    expect(await screen.findByText("Rent due soon")).toBeInTheDocument();
    expect(screen.getByText("fi_rent")).toBeInTheDocument();
    expect(
      screen.getByText("Several obligations cluster mid-month."),
    ).toBeInTheDocument();
    expect(getInsights).not.toHaveBeenCalledWith(
      "spending",
      expect.anything(),
      expect.anything(),
    );
  });

  it("shows empty state when scope has no insights", async () => {
    getInsights.mockResolvedValue({
      surfaceId: "spending",
      scope: "2026-07",
      summary: {},
      insights: [],
      labels: spendingSurface.labels,
      ui: spendingSurface.ui,
      scopeConfig: spendingSurface.scope,
      summaryFields: spendingSurface.summaryFields,
      linkFields: spendingSurface.linkFields,
    });
    renderPage();

    expect(
      await screen.findByTestId("insight-surface-empty-spending"),
    ).toBeInTheDocument();
  });

  it("blocks refresh when spend guard is blocked", async () => {
    spendBlocked = true;
    renderPage();

    await screen.findByText("Dining elevated");
    fireEvent.click(screen.getByTestId("insight-surface-refresh-spending"));

    expect(notifyAiSpendLimit).toHaveBeenCalledWith("blocked");
    expect(refreshInsights).not.toHaveBeenCalled();
  });

  it("renders forbidden when permission is missing", async () => {
    canRun = false;
    renderPage();

    expect(
      await screen.findByText(/do not have permission/i),
    ).toBeInTheDocument();
    expect(getInsightSurfaces).not.toHaveBeenCalled();
    expect(getInsights).not.toHaveBeenCalled();
  });
});
