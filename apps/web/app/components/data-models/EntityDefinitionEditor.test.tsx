import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MOCK_ENTITY_CATALOG } from "../../test/entity-catalog-fixtures";
import { EntityDefinitionEditor } from "./EntityDefinitionEditor";

const mockGetEntityDefinition = vi.fn();
const mockPatchEntityDefinition = vi.fn();
const mockRefresh = vi.fn();

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: MOCK_ENTITY_CATALOG,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("../../lib/api-client", () => ({
  getEntityDefinition: (...args: unknown[]) => mockGetEntityDefinition(...args),
  patchEntityDefinition: (...args: unknown[]) =>
    mockPatchEntityDefinition(...args),
  isApiClientError: (error: unknown) =>
    error instanceof Error && error.name === "ApiClientError",
}));

const mockT = (key: string, options?: { name?: string }) =>
  key === "dataModels.editTitle" && options?.name
    ? `Edit ${options.name}`
    : key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

describe("EntityDefinitionEditor", () => {
  it("loads definition and saves patches", async () => {
    mockGetEntityDefinition.mockResolvedValue({
      id: "def_1",
      tenantId: "tenant_a",
      name: "loan",
      label: "Loans",
      fields: [{ name: "amount", type: "number", required: true }],
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mockPatchEntityDefinition.mockResolvedValue({
      id: "def_1",
      tenantId: "tenant_a",
      name: "loan",
      label: "Loan Records",
      fields: [{ name: "amount", type: "number", required: true }],
      version: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    const onSaved = vi.fn();
    render(
      <EntityDefinitionEditor
        definitionId="def_1"
        tenantId="tenant_a"
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("dataModels.saveModel")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("dataModels.modelLabel"), {
      target: { value: "Loan Records" },
    });
    fireEvent.click(screen.getByText("dataModels.saveModel"));

    await waitFor(() => {
      expect(mockPatchEntityDefinition).toHaveBeenCalledWith(
        "def_1",
        expect.objectContaining({ label: "Loan Records" }),
      );
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });
});
