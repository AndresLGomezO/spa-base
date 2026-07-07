import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDefaultComputedComputation } from "../../../components/metrics/metric-definition-draft";
import type { MetricDefinitionDraft } from "../../../components/metrics/metric-definition-draft";
import { TestEntityCatalogProvider } from "../../../test/test-entity-catalog-provider";

const mockEditorState = vi.hoisted(() => {
  const draft = {
    name: "Total revenue",
    description: "Sum of paid amounts",
    computationMode: "aggregated" as const,
    sourceType: "entity" as const,
    sourceModel: "payment",
    sourceQueryDefinitionId: "",
    status: "ACTIVE" as const,
    aggregationOperation: "SUM" as const,
    aggregationField: "amount",
    fieldsDependency: ["amount"],
    filterRows: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    parameters: [],
    computation: undefined,
    valueDisplayFormat: "currency" as const,
    version: 1,
    schemaVersionDependency: 1,
  };

  const definition = {
    id: "metric_1",
    tenantId: "tenant_a",
    metricId: "total_revenue",
    name: "Total revenue",
    description: "Sum of paid amounts",
    computationMode: "aggregated" as const,
    sourceModel: "payment",
    sourceQueryDefinitionId: null,
    status: "ACTIVE" as const,
    aggregations: [{ field: "amount", operation: "SUM" as const }],
    filters: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    fieldsDependency: ["amount"],
    parameters: [],
    valueDisplayFormat: "currency" as const,
    version: 1,
    schemaVersionDependency: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    selectedDefinition: definition as typeof definition | null,
    draft: draft as MetricDefinitionDraft | null,
    definitions: [definition] as (typeof definition)[],
  };
});

vi.mock("../metrics-context", () => ({
  useMetrics: () => ({
    editor: mockEditorState,
  }),
}));

vi.mock("../../../lib/api-client", () => ({
  listEntityQueryDefinitions: vi.fn(async () => ({ items: [] })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { MetricPreviewPanel } from "./MetricPreviewPanel";

function renderPanel() {
  return render(
    <TestEntityCatalogProvider items={[]}>
      <MetricPreviewPanel />
    </TestEntityCatalogProvider>,
  );
}

describe("MetricPreviewPanel", () => {
  it("renders the selected metric overview", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    mockEditorState.draft = {
      name: "Total revenue",
      description: "Sum of paid amounts",
      computationMode: "aggregated",
      sourceType: "entity",
      sourceModel: "payment",
      sourceQueryDefinitionId: "",
      status: "ACTIVE",
      aggregationOperation: "SUM",
      aggregationField: "amount",
      fieldsDependency: ["amount"],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      parameters: [],
      computation: createDefaultComputedComputation(),
      valueDisplayFormat: "currency",
      version: 1,
      schemaVersionDependency: 1,
    };
    renderPanel();

    expect(screen.getByText("metrics.preview.panelTitle")).toBeInTheDocument();
    expect(screen.getByText("Total revenue")).toBeInTheDocument();
    expect(
      screen.getByText("metrics.preview.aggregated.sourceEntity"),
    ).toBeInTheDocument();
  });

  it("shows empty message when no metric is selected", () => {
    mockEditorState.selectedDefinition = null;
    mockEditorState.draft = null;
    renderPanel();

    expect(screen.getByText("metrics.preview.empty")).toBeInTheDocument();
  });

  it("switches to the advanced tab", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    mockEditorState.draft = {
      name: "Total revenue",
      description: "Sum of paid amounts",
      computationMode: "aggregated",
      sourceType: "entity",
      sourceModel: "payment",
      sourceQueryDefinitionId: "",
      status: "ACTIVE",
      aggregationOperation: "SUM",
      aggregationField: "amount",
      fieldsDependency: ["amount"],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      parameters: [],
      computation: createDefaultComputedComputation(),
      valueDisplayFormat: "currency",
      version: 1,
      schemaVersionDependency: 1,
    };
    renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "dataHooks.preview.tabs.advanced" }),
    );

    expect(
      screen.getByText("metrics.preview.advanced.title"),
    ).toBeInTheDocument();
  });
});
