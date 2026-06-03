import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { createDefaultFormLayout } from "@repo/entities";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { MOCK_ENTITY_CATALOG } from "../../test/entity-catalog-fixtures";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { EntityForm } from "./EntityForm";

const createMock = vi.fn(async () => null);

vi.mock("../../hooks/useEntity", () => ({
  useEntity: vi.fn(() => ({
    items: [],
    totalCount: 0,
    page: 1,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    isSubmitting: false,
    fieldErrors: { name: "Name is required." },
    create: createMock,
    update: vi.fn(),
    remove: vi.fn(),
    getById: vi.fn(),
  })),
}));

vi.mock("../../hooks/useEntityPermissions", () => ({
  useEntityPermissions: vi.fn(() => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  })),
}));

vi.mock("../../hooks/useFieldAccess", () => ({
  useFieldAccess: vi.fn(() => ({})),
  getFieldAccessLevel: vi.fn(() => undefined),
}));

function renderForm() {
  return render(
    <TestEntityCatalogProvider>
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
        </I18nextProvider>
      </MemoryRouter>
    </TestEntityCatalogProvider>,
  );
}

const widgetWithDesignedCreateForm: EntityCatalogEntry = {
  ...MOCK_ENTITY_CATALOG[0]!,
  ui: {
    ...MOCK_ENTITY_CATALOG[0]!.ui,
    forms: {
      create: {
        sections: [{ title: "Details", fields: ["name", "email", "isActive"] }],
        layout: createDefaultFormLayout(["name", "email", "isActive"]),
      },
      edit: {
        sections: [{ title: "Details", fields: ["name", "email", "isActive"] }],
        layout: createDefaultFormLayout(["name", "email", "isActive"]),
      },
    },
  },
};

describe("EntityForm", () => {
  it("renders designed create layout with form-field widgets", () => {
    render(
      <TestEntityCatalogProvider items={[widgetWithDesignedCreateForm]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    expect(document.getElementById("widget-name")).toBeInTheDocument();
    expect(document.getElementById("widget-email")).toBeInTheDocument();
    expect(document.getElementById("widget-isActive")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("shows validation errors from the entity hook", () => {
    renderForm();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("submits create payloads", async () => {
    renderForm();

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
  });
});
