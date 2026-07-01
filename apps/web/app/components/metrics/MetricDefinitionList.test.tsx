import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { MetricDefinitionList } from "./MetricDefinitionList";

vi.mock("../../lib/api-client", () => ({
  isApiClientError: (error: unknown) => error instanceof Error,
  putMetricDefinitionsCatalog: vi.fn(),
}));

import { putMetricDefinitionsCatalog } from "../../lib/api-client";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MetricDefinitionList", () => {
  it("replaces the catalog after import confirmation", async () => {
    vi.mocked(putMetricDefinitionsCatalog).mockResolvedValue({
      counts: { created: 0, updated: 1, deleted: 0 },
      backfillSummary: { created: 0, updated: 1, skipped: 0, failed: 0 },
      items: [],
    });
    const onCatalogReplaced = vi.fn();

    render(
      <MemoryRouter>
        <MetricDefinitionList
          items={[
            {
              id: "metric_1",
              tenantId: "tenant_a",
              metricId: "loan_total",
              name: "Loan total",
              sourceModel: "loan",
              filters: [],
              groupBy: [],
              dimensions: [],
              dateFieldGranularity: {},
              valueDisplayFormat: "number",
              aggregations: [{ operation: "SUM", field: "amount" }],
              target: { collection: "metric_1", granularity: "dynamic" },
              version: 1,
              schemaVersionDependency: 0,
              fieldsDependency: ["amount"],
              status: "ACTIVE",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ]}
          isLoading={false}
          canCreate
          canUpdate
          canBackfill
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onCatalogReplaced={onCatalogReplaced}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("metrics.json.importTrigger"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: JSON.stringify({
          kind: "metric-definitions-catalog",
          version: 1,
          exportedAt: new Date().toISOString(),
          metricDefinitions: [
            {
              name: "Loan total",
              sourceModel: "loan",
              aggregations: [{ operation: "SUM", field: "amount" }],
              fieldsDependency: ["amount"],
              schemaVersionDependency: 0,
              status: "ACTIVE",
            },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByText("metrics.json.apply"));
    fireEvent.click(screen.getByText("metrics.json.catalog.confirmAction"));

    await waitFor(() => {
      expect(putMetricDefinitionsCatalog).toHaveBeenCalled();
      expect(onCatalogReplaced).toHaveBeenCalled();
    });
  });
});
