import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { EntityDefinitionList } from "./EntityDefinitionList";

vi.mock("../../lib/api-client", () => ({
  isApiClientError: (error: unknown) => error instanceof Error,
  putEntityDefinitionsCatalog: vi.fn(),
}));

import { putEntityDefinitionsCatalog } from "../../lib/api-client";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EntityDefinitionList", () => {
  it("renders existing models and create action", () => {
    render(
      <MemoryRouter>
        <EntityDefinitionList
          items={[
            {
              id: "def_1",
              tenantId: "tenant_a",
              name: "loan",
              label: "Loans",
              fields: [{ name: "amount", type: "number", required: true }],
              version: 1,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ]}
          isLoading={false}
          canCreate
          onCreate={vi.fn()}
          canUpdate
          onEdit={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("loan")).toBeInTheDocument();
    expect(screen.getByText("Loans")).toBeInTheDocument();
    expect(screen.getByText("dataModels.createModel")).toBeInTheDocument();
    expect(screen.getByText("entity.edit")).toBeInTheDocument();
    expect(screen.getByText("dataModels.json.viewTrigger")).toBeInTheDocument();
    expect(
      screen.getByText("dataModels.json.importTrigger"),
    ).toBeInTheDocument();
  });

  it("replaces the catalog after import confirmation", async () => {
    vi.mocked(putEntityDefinitionsCatalog).mockResolvedValue({
      counts: { created: 0, updated: 1, deleted: 0 },
      items: [],
    });
    const onCatalogReplaced = vi.fn();

    render(
      <MemoryRouter>
        <EntityDefinitionList
          items={[
            {
              id: "def_1",
              tenantId: "tenant_a",
              name: "loan",
              label: "Loans",
              fields: [{ name: "amount", type: "number", required: true }],
              version: 1,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ]}
          isLoading={false}
          canCreate
          canUpdate
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onCatalogReplaced={onCatalogReplaced}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("dataModels.json.importTrigger"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: JSON.stringify({
          kind: "entity-definitions-catalog",
          version: 1,
          exportedAt: new Date().toISOString(),
          entityDefinitions: [
            {
              name: "loan",
              label: "Loans v2",
              fields: [{ name: "amount", type: "number", required: true }],
            },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByText("dataModels.json.apply"));
    fireEvent.click(screen.getByText("dataModels.json.catalog.confirmAction"));

    await waitFor(() => {
      expect(putEntityDefinitionsCatalog).toHaveBeenCalled();
      expect(onCatalogReplaced).toHaveBeenCalled();
    });
  });
});
