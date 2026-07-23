import type React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, beforeEach, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { MetricValueDisplay } from "./MetricValueDisplay";

vi.mock("../../hooks/metrics/useCanReadMetricValues", () => ({
  useMetricReadAccess: vi.fn(),
}));

vi.mock("../../hooks/metrics/useMetricRow", () => ({
  useMetricRow: vi.fn(),
}));

vi.mock("../../hooks/metrics/useMetricEvaluate", () => ({
  useMetricEvaluate: vi.fn(),
}));

vi.mock("../../hooks/metrics/useActiveMetricDefinitions", () => ({
  useActiveMetricDefinitions: vi.fn(),
}));

import { useMetricReadAccess } from "../../hooks/metrics/useCanReadMetricValues";
import { useMetricRow } from "../../hooks/metrics/useMetricRow";
import { useMetricEvaluate } from "../../hooks/metrics/useMetricEvaluate";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions";

const mockUseMetricReadAccess = vi.mocked(useMetricReadAccess);
const mockUseMetricRow = vi.mocked(useMetricRow);
const mockUseMetricEvaluate = vi.mocked(useMetricEvaluate);
const mockUseActiveMetricDefinitions = vi.mocked(useActiveMetricDefinitions);

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
  beforeEach(() => {
    mockUseMetricEvaluate.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMetricEvaluate>);
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: [definition],
      isLoading: false,
      isSuccess: true,
      isFetched: true,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
  });

  it("shows forbidden state when metricValue.read is denied", () => {
    mockUseMetricReadAccess.mockReturnValue("denied");
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
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(
      screen.getByRole("status", { name: /Loading metric/i }),
    ).toBeInTheDocument();
  });

  it("shows loading state while the metric catalog is loading", () => {
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
      isFetched: false,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
    mockUseMetricReadAccess.mockReturnValue("pending");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay({ metricDefinitionId: "Total revenue" });

    expect(
      screen.getByRole("status", { name: /Loading metric/i }),
    ).toBeInTheDocument();
  });

  it("shows unconfigured state when metricDefinitionId is missing", () => {
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isFetched: true,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
    mockUseMetricReadAccess.mockReturnValue("pending");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay({ metricDefinitionId: "" });

    expect(
      screen.getByText("Select a metric for this KPI."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /Loading metric/i }),
    ).not.toBeInTheDocument();
  });

  it("shows error state when the row query fails", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("Unable to load metric")).toBeInTheDocument();
  });

  it("resolves metric display names from the active catalog", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
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

    renderDisplay({ metricDefinitionId: "Total revenue" });

    expect(screen.getByText("Total revenue")).toBeInTheDocument();
    expect(screen.getByText("4,200")).toBeInTheDocument();
  });

  it("renders the primary aggregation value", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
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
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: [{ ...definition, valueDisplayFormat: "currency" as const }],
      isLoading: false,
      isSuccess: true,
      isFetched: true,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
    mockUseMetricReadAccess.mockReturnValue("allowed");
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

  it("shows formatted zero when no metric row is returned", () => {
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("No value")).not.toBeInTheDocument();
  });

  it("shows formatted currency zero when no metric row is returned", () => {
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: [{ ...definition, valueDisplayFormat: "currency" as const }],
      isLoading: false,
      isSuccess: true,
      isFetched: true,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);

    renderDisplay();

    expect(screen.getByText("$ 0")).toBeInTheDocument();
    expect(screen.queryByText("No value")).not.toBeInTheDocument();
  });

  it("shows a dash when a computed metric evaluates to empty values", () => {
    mockUseActiveMetricDefinitions.mockReturnValue({
      data: [
        {
          ...definition,
          computationMode: "computed" as const,
          valueDisplayFormat: "percent" as const,
          parameters: [
            {
              name: "currentPeriod",
              valueType: "dateBucket" as const,
              granularity: "month" as const,
            },
          ],
          computation: {
            type: "percentChange" as const,
            current: {
              type: "metricRef" as const,
              metricDefinitionId: "Income by Month",
              parameterMap: { date: "currentPeriod" },
            },
            baseline: {
              type: "metricRef" as const,
              metricDefinitionId: "Income by Month",
              parameterMap: { date: "comparisonPeriod" },
            },
          },
        },
      ],
      isLoading: false,
      isSuccess: true,
      isFetched: true,
      isError: false,
    } as unknown as ReturnType<typeof useActiveMetricDefinitions>);
    mockUseMetricReadAccess.mockReturnValue("allowed");
    mockUseMetricRow.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMetricRow>);
    mockUseMetricEvaluate.mockReturnValue({
      data: {
        values: {},
        evaluatedAt: "2026-01-01T00:00:00.000Z",
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMetricEvaluate>);

    renderDisplay({
      presentation: "inline",
      parameterBindings: {
        currentPeriod: { type: "static", value: "2026-06" },
      },
    });

    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
