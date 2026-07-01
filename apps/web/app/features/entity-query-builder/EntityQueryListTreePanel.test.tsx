import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityQueryListTreePanel } from "./EntityQueryListTreePanel";

vi.mock("../../lib/api-client", () => ({
  isApiClientError: (error: unknown) => error instanceof Error,
  putEntityQueryDefinitionsCatalog: vi.fn(),
}));

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({ items: [] }),
}));

vi.mock("./entity-query-builder-context", () => ({
  useEntityQueryBuilder: () => ({
    editor: {
      definitions: [
        {
          id: "entity_query_1",
          tenantId: "tenant_a",
          queryId: "upcoming_payments",
          name: "Upcoming payments",
          sourceEntity: "transaction",
          filter: { type: "group", combinator: "and", children: [] },
          sort: [],
          limitMode: "topN",
          limit: 20,
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      reloadDefinitions: vi.fn(async () => undefined),
      setSelectedId: vi.fn(),
      selectedId: "entity_query_1",
    },
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    requestMetadataEdit: vi.fn(),
    requestDelete: vi.fn(),
  }),
}));

import { putEntityQueryDefinitionsCatalog } from "../../lib/api-client";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EntityQueryListTreePanel", () => {
  it("replaces the catalog after import confirmation", async () => {
    vi.mocked(putEntityQueryDefinitionsCatalog).mockResolvedValue({
      counts: { created: 0, updated: 1, deleted: 0 },
      items: [],
    });

    render(<EntityQueryListTreePanel />);

    fireEvent.click(screen.getAllByText("queryBuilder.json.importTrigger")[0]!);
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: JSON.stringify({
          kind: "entity-query-definitions-catalog",
          version: 1,
          exportedAt: new Date().toISOString(),
          entityQueryDefinitions: [
            {
              name: "Upcoming payments",
              sourceEntity: "transaction",
              filter: { type: "group", combinator: "and", children: [] },
              sort: [],
              limitMode: "topN",
              limit: 20,
              status: "ACTIVE",
            },
          ],
        }),
      },
    });

    fireEvent.click(screen.getByText("queryBuilder.json.apply"));
    fireEvent.click(
      screen.getByText("queryBuilder.json.catalog.confirmAction"),
    );

    await waitFor(() => {
      expect(putEntityQueryDefinitionsCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
