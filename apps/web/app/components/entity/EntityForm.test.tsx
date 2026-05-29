import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityForm } from "./EntityForm";

const createMock = vi.fn(async () => null);

vi.mock("../../hooks/useEntity", () => ({
  useEntity: vi.fn(() => ({
    items: [],
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    refresh: vi.fn(),
    loadMore: vi.fn(),
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
          <EntityForm entityName="organization" mode="create" />
        </I18nextProvider>
      </MemoryRouter>
    </TestEntityCatalogProvider>,
  );
}

describe("EntityForm", () => {
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
