import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UnifiedInsightsCard } from "./UnifiedInsightsCard";

const getInsightSurfaces = vi.fn();
const getInsights = vi.fn();
let canRun = true;

vi.mock("../../lib/api-client", () => ({
  getInsightSurfaces: (...args: unknown[]) => getInsightSurfaces(...args),
  getInsights: (...args: unknown[]) => getInsights(...args),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => canRun,
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "rates",
    user: { uid: "u1" },
  }),
}));

const surfaces = [
  {
    id: "spending",
    icon: "Lightbulb",
    permission: "ai.chat.run",
    labels: {
      title: "Spending insights",
      description: "Ranked spending insights.",
      seeAll: "See all",
      emptyScope: "No spending insights for this month yet.",
      summary: { totalIncome: "Income", totalExpenses: "Expenses" },
    },
    ui: { showInHome: true, homeOrder: 1, tabOrder: 1 },
    scope: { field: "month", queryParam: "month", format: "YYYY-MM" as const },
    linkFields: [],
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
    ],
  },
  {
    id: "payments",
    icon: "CalendarClock",
    permission: "ai.chat.run",
    labels: {
      title: "Payment insights",
      seeAll: "See all",
      emptyScope: "No payment insights yet.",
      summary: {},
    },
    ui: { showInHome: true, homeOrder: 2, tabOrder: 2 },
    scope: {
      field: "windowKey",
      queryParam: "window",
      format: "YYYY-MM" as const,
    },
    linkFields: [],
    summaryFields: [],
  },
];

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UnifiedInsightsCard
          config={{
            kind: "metric-widget",
            entityName: "paymentSchedule",
            widgetId: "unified-home-insights",
          }}
          dashboardDateFilter={{
            value: "2026-06",
            granularity: "month",
            param: "period",
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("UnifiedInsightsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canRun = true;
    getInsightSurfaces.mockResolvedValue({ surfaces });
    getInsights.mockImplementation(async (surfaceId: string) => {
      if (surfaceId === "spending") {
        return {
          surfaceId: "spending",
          scope: "2026-06",
          insights: [
            {
              recordId: "a",
              title: "Insight A",
              rank: 1,
              links: {},
              narrative: "A body",
            },
          ],
          labels: surfaces[0]!.labels,
          ui: surfaces[0]!.ui,
          scopeConfig: surfaces[0]!.scope,
          summaryFields: surfaces[0]!.summaryFields,
          linkFields: [],
          summary: { totalIncome: 1000, totalExpenses: 400 },
          currency: "COP",
        };
      }
      return {
        surfaceId,
        scope: "2026-06",
        insights: [],
        labels: surfaces[1]!.labels,
        ui: surfaces[1]!.ui,
        scopeConfig: surfaces[1]!.scope,
        summaryFields: [],
        linkFields: [],
        summary: {},
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders spending insights for the dashboard date scope", async () => {
    renderCard();

    await waitFor(() => {
      expect(getInsightSurfaces).toHaveBeenCalled();
    });
    expect(await screen.findByText("Insight A")).toBeInTheDocument();
    expect(getInsights).toHaveBeenCalledWith(
      "spending",
      "2026-06",
      expect.any(String),
    );
    expect(
      screen.getByTestId("unified-insights-see-all-spending"),
    ).toHaveAttribute("href", "/ai/insights?tab=spending&month=2026-06");
  });

  it("switches tabs and shows empty-scope copy", async () => {
    renderCard();
    await screen.findByText("Insight A");

    fireEvent.click(screen.getByTestId("unified-insights-tab-payments"));

    await waitFor(() => {
      expect(getInsights).toHaveBeenCalledWith(
        "payments",
        "2026-06",
        expect.any(String),
      );
    });
    expect(
      await screen.findByTestId("unified-insights-empty-payments"),
    ).toHaveTextContent("No payment insights yet.");
  });

  it("renders nothing without permission", () => {
    canRun = false;
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
    expect(getInsightSurfaces).not.toHaveBeenCalled();
  });
});
