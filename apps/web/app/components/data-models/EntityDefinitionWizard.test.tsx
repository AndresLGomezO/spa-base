import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityDefinitionWizard } from "./EntityDefinitionWizard";

const mockCreateEntityDefinition = vi.fn();
const mockListEntityCategories = vi.fn();

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("../../lib/api-client", () => ({
  createEntityDefinition: (...args: unknown[]) =>
    mockCreateEntityDefinition(...args),
  listEntityDefinitions: vi.fn(async () => ({ items: [] })),
  listEntityCategories: () => mockListEntityCategories(),
  isApiClientError: (error: unknown) =>
    error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EntityDefinitionWizard", () => {
  it("sends ui.nav.icon when using category icon on create", async () => {
    mockListEntityCategories.mockResolvedValue({
      items: [
        {
          id: "cat_sales",
          tenantId: "tenant_a",
          name: "Sales",
          icon: "Tags",
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    mockCreateEntityDefinition.mockResolvedValue({
      id: "def_1",
      tenantId: "tenant_a",
      name: "deal",
      label: "Deals",
      fields: [{ name: "title", type: "string", required: true }],
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(<EntityDefinitionWizard onCreated={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("dataModels.modelName"), {
      target: { value: "deal" },
    });
    fireEvent.change(screen.getByLabelText("dataModels.modelLabel"), {
      target: { value: "Deals" },
    });
    fireEvent.click(screen.getByText("dataModels.next"));

    await waitFor(() => {
      expect(screen.getByText("dataModels.addField")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("dataModels.addField"));
    fireEvent.click(screen.getByText("dataModels.fieldTypes.string"));
    fireEvent.change(screen.getByLabelText("dataModels.fieldName"), {
      target: { value: "title" },
    });
    fireEvent.click(screen.getByText("entity.save"));
    fireEvent.click(screen.getByText("dataModels.next"));

    await waitFor(() => {
      expect(
        screen.getByLabelText("dataModels.navCategory"),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("dataModels.navCategory"), {
      target: { value: "cat_sales" },
    });
    fireEvent.click(screen.getByLabelText("dataModels.useCategoryIcon"));

    await waitFor(() => {
      expect(screen.getByLabelText("dataModels.navIcon")).toHaveValue("Tags");
    });

    fireEvent.click(screen.getByText("dataModels.createModel"));

    await waitFor(() => {
      expect(mockCreateEntityDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "deal",
          navCategoryId: "cat_sales",
          ui: expect.objectContaining({
            nav: expect.objectContaining({ icon: "Tags", label: "Deals" }),
          }),
        }),
      );
    });
  });
});
