import type React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { MetricValueDisplay } from "./MetricValueDisplay";

vi.mock("../../hooks/metrics/useCanReadMetricValues", () => ({
  useMetricReadAccess: vi.fn(),
}));

vi.mock("../../hooks/metrics/useMetricDefinition", () => ({
  useMetricDefinition: vi.fn(),
}));

vi.mock("../../hooks/metrics/useMetricRow", () => ({
  useMetricRow: vi.fn(),
}));

import { useMetricReadAccess } from "../../hooks/metrics/useCanReadMetricValues";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition";
import { useMetricRow } from "../../hooks/metrics/useMetricRow";

const mockUseMetricReadAccess = vi.mocked(useMetricReadAccess);
const mockUseMetricDefinition = vi.mocked(useMetricDefinition);
const mockUseMetricRow = vi.mocked(useMetricRow);

const definition = {
  id: "metric-1",
  name: "Total revenue",
  status: "ACTIVE" as const,
  sourceModel: "order",
  aggregations: [{ operation: "SUM" as const, field: "amount" }],
  groupBy: [],
  dimensions: [],
  dateFieldGranularity: {},
  valueDisplayFormat: "number" as const,
  fieldsDependency: [],
  version: 1,
  createdAt: "",
  updatedAt: "",
};

function renderDisplay(
  props: Partial<React.ComponentProps<typeof MetricValueDisplay>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MetricValueDisplay
          metricDefinitionId="metric-1"
          groupBindings={{}}
          dimensionBindings={{}}
          {...props}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("MetricValueDisplay", () => {
  it("shows forbidden state when metricValue.read is denied", () => {
    mockUseMetricReadAccess.mockReturnValue("denied");
    mockUseMetricDefinition.mockReturnValue({
      data: definition,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useMetricDefinition>);
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(
      screen.getByText("Metric values are not available for your role."),
    ).toBeInTheDocument();
  });

  it("shows loading state while the row query is loading", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricDefinition.mockReturnValue({
      data: definition,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useMetricDefinition>);
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("Loading metric…")).toBeInTheDocument();
  });

  it("renders the primary aggregation value", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricDefinition.mockReturnValue({
      data: definition,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useMetricDefinition>);
    mockUseMetricRow.mockReturnValue({
      data: {
        id: "row-1",
        metricDefinitionId: "metric-1",
        group: {},
        dimensions: {},
        values: { sum_amount: 4200 },
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("Total revenue")).toBeInTheDocument();
    expect(screen.getByText("4,200")).toBeInTheDocument();
  });

  it("formats currency metrics for display", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricDefinition.mockReturnValue({
      data: { ...definition, valueDisplayFormat: "currency" as const },
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useMetricDefinition>);
    mockUseMetricRow.mockReturnValue({
      data: {
        id: "row-1",
        metricDefinitionId: "metric-1",
        group: {},
        dimensions: {},
        values: { sum_amount: 1200 },
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("$ 1,200")).toBeInTheDocument();
  });

  it("inline presentation renders value without card chrome or title", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricDefinition.mockReturnValue({
      data: definition,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useMetricDefinition>);
    mockUseMetricRow.mockReturnValue({
      data: {
        id: "row-1",
        metricDefinitionId: "metric-1",
        group: {},
        dimensions: {},
        values: { sum_amount: 4200 },
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    const { container } = renderDisplay({ presentation: "inline" });

    expect(screen.getByText("4,200")).toBeInTheDocument();
    expect(screen.queryByText("Total revenue")).not.toBeInTheDocument();
    expect(container.querySelector("article")).toBeNull();
  });
});
