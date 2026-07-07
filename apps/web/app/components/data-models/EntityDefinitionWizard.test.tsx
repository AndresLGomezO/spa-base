import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { selectAdminSelectOption } from "../../test/admin-select-test-utils";
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

    selectAdminSelectOption("dataModels.navCategory", "Sales");
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

  it("imports entity JSON into the wizard form", () => {
    mockListEntityCategories.mockResolvedValue({ items: [] });

    render(<EntityDefinitionWizard onCreated={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "jsonActions.importAriaLabel" }),
    );
    const importDialog = screen.getAllByRole("dialog").at(-1)!;
    fireEvent.change(importDialog.querySelector("textarea")!, {
      target: {
        value: JSON.stringify({
          kind: "entity-definition",
          version: 1,
          data: {
            name: "loan",
            label: "Loans",
            fields: [{ name: "amount", type: "number", required: true }],
          },
        }),
      },
    });
    fireEvent.click(screen.getByText("dataModels.json.apply"));

    expect(screen.getByLabelText("dataModels.modelName")).toHaveValue("loan");
    expect(screen.getByLabelText("dataModels.modelLabel")).toHaveValue("Loans");
  });
});
