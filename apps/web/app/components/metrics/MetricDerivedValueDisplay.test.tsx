import type React from "react";
import { render, screen } from "@testing-library/react";
import { describe, beforeEach, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { MetricDerivedValueDisplay } from "./MetricDerivedValueDisplay";

vi.mock("../../hooks/metrics/useMetricDerivedValue", () => ({
  useMetricDerivedValue: vi.fn(),
}));

import { useMetricDerivedValue } from "../../hooks/metrics/useMetricDerivedValue";

const mockUseMetricDerivedValue = vi.mocked(useMetricDerivedValue);

const baseConfig = {
  expression: [
    { type: "metric" as const, metricDefinitionId: "income" },
    { type: "operator" as const, op: "-" as const },
    { type: "metric" as const, metricDefinitionId: "outflows" },
  ],
  groupBindings: {
    date: { type: "static" as const, value: "2025-09" },
  },
  dimensionBindings: {},
};

const displayDefinition = {
  id: "income",
  tenantId: "tenant-1",
  metricId: "income",
  name: "Monthly income",
  status: "ACTIVE" as const,
  sourceModel: "transaction",
  filters: [],
  aggregations: [{ operation: "SUM" as const, field: "amount" }],
  groupBy: ["date"],
  dimensions: [],
  dateFieldGranularity: { date: "month" as const },
  valueDisplayFormat: "currency" as const,
  target: { collection: "metrics", granularity: "month" },
  schemaVersionDependency: 1,
  fieldsDependency: [],
  version: 1,
  createdAt: "",
  updatedAt: "",
};

function renderDisplay(
  props: Partial<React.ComponentProps<typeof MetricDerivedValueDisplay>> = {},
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MetricDerivedValueDisplay config={baseConfig} {...props} />
    </I18nextProvider>,
  );
}

describe("MetricDerivedValueDisplay", () => {
  beforeEach(() => {
    mockUseMetricDerivedValue.mockReset();
  });

  it("shows unconfigured state", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "unconfigured",
      total: null,
      displayDefinition: undefined,
      shapeMismatch: null,
      grammarError: null,
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(
      screen.getByText("Build a formula with at least one metric."),
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "loading",
      total: null,
      displayDefinition: undefined,
      shapeMismatch: null,
      grammarError: null,
      isLoading: true,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(
      screen.getByRole("status", { name: /Loading metric/i }),
    ).toBeInTheDocument();
  });

  it("renders the evaluated total using the first metric format", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "ready",
      total: 3800,
      displayDefinition,
      shapeMismatch: null,
      grammarError: null,
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay({
      config: { ...baseConfig, label: "Total balance" },
    });

    expect(screen.getByText("Total balance")).toBeInTheDocument();
    expect(screen.getByText("$ 3,800")).toBeInTheDocument();
    expect(screen.getByText("income − outflows")).toBeInTheDocument();
  });

  it("shows invalid expression state", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "invalidExpression",
      total: null,
      displayDefinition: undefined,
      shapeMismatch: null,
      grammarError: "missingOperand",
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(
      screen.getByText("This formula is incomplete or invalid."),
    ).toBeInTheDocument();
  });

  it("shows divide by zero state", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "divideByZero",
      total: null,
      displayDefinition: undefined,
      shapeMismatch: null,
      grammarError: null,
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(
      screen.getByText("Cannot divide by zero for the current metric values."),
    ).toBeInTheDocument();
  });

  it("shows shape mismatch state", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "shapeMismatch",
      total: null,
      displayDefinition: undefined,
      shapeMismatch: "Outflows",
      grammarError: null,
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(
      screen.getByText(
        "All metrics in the formula must share the same group-by and dimension keys.",
      ),
    ).toBeInTheDocument();
  });

  it("shows formatted zero when the derived total is empty", () => {
    mockUseMetricDerivedValue.mockReturnValue({
      status: "empty",
      total: null,
      displayDefinition,
      shapeMismatch: null,
      grammarError: null,
      isLoading: false,
      expression: baseConfig.expression,
    } as unknown as ReturnType<typeof useMetricDerivedValue>);

    renderDisplay();

    expect(screen.getByText("$ 0")).toBeInTheDocument();
    expect(screen.queryByText("No value")).not.toBeInTheDocument();
  });
});
