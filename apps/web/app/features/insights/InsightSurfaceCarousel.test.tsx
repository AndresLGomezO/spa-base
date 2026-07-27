import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InsightSurfaceCarousel } from "./InsightSurfaceCarousel";

const getInsights = vi.fn();
let canRun = true;

vi.mock("../../lib/api-client", () => ({
  getInsights: (...args: unknown[]) => getInsights(...args),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => canRun,
}));

const surface = {
  id: "spending",
  permission: "ai.chat.run",
  labels: {
    title: "Spending insights",
    description: "Ranked spending insights.",
    seeAll: "See all",
    summary: {},
  },
  ui: { showInHome: true, homeOrder: 1, tabOrder: 1 },
  scope: { field: "month", queryParam: "month", format: "YYYY-MM" as const },
  linkFields: [{ field: "categoryId", entity: "category" }],
  summaryFields: [],
};

function renderCarousel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InsightSurfaceCarousel surface={surface} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InsightSurfaceCarousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canRun = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders insight tiles and a See all link for the current scope", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));

    getInsights.mockResolvedValue({
      surfaceId: "spending",
      scope: "2026-07",
      insights: [
        {
          recordId: "a",
          title: "Insight A",
          rank: 1,
          links: {},
          narrative: "A body",
        },
        {
          recordId: "b",
          title: "Insight B",
          rank: 2,
          links: {},
          narrative: "B body",
        },
        {
          recordId: "c",
          title: "Insight C",
          rank: 3,
          links: {},
          narrative: "C body",
        },
      ],
      labels: surface.labels,
      ui: surface.ui,
      scopeConfig: surface.scope,
      summaryFields: [],
      linkFields: surface.linkFields,
      summary: {},
    });

    renderCarousel();

    await waitFor(() => {
      expect(getInsights).toHaveBeenCalledWith(
        "spending",
        "2026-07",
        expect.any(String),
      );
    });
    expect(await screen.findByText("Insight A")).toBeInTheDocument();
    expect(screen.getByText("Insight B")).toBeInTheDocument();
    expect(screen.getByText("Insight C")).toBeInTheDocument();

    const seeAll = screen.getByTestId("insight-carousel-see-all-spending");
    expect(seeAll).toHaveAttribute(
      "href",
      "/ai/insights?tab=spending&month=2026-07",
    );
  });

  it("renders nothing without permission", () => {
    canRun = false;
    const { container } = renderCarousel();
    expect(container).toBeEmptyDOMElement();
    expect(getInsights).not.toHaveBeenCalled();
  });

  it("renders nothing for an empty scope", async () => {
    getInsights.mockResolvedValue({
      surfaceId: "spending",
      scope: "2026-07",
      insights: [],
      labels: surface.labels,
      ui: surface.ui,
      scopeConfig: surface.scope,
      summaryFields: [],
      linkFields: surface.linkFields,
      summary: {},
    });
    const { container } = renderCarousel();
    await waitFor(() => {
      expect(getInsights).toHaveBeenCalled();
      expect(container).toBeEmptyDOMElement();
    });
  });
});
