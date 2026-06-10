import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { createDefaultFormLayout } from "@repo/entities";
import {
  createDefaultWizardShellLayout,
  createDefaultWizardFormConfig,
  createEmptyLayout,
} from "@repo/ui-builder-core";
import { toast } from "@repo/ui";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { MOCK_ENTITY_CATALOG } from "../../test/entity-catalog-fixtures";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { EntityForm } from "./EntityForm";
import { useEntity, type EntityRecord } from "../../hooks/useEntity";

const createMock = vi.fn(async (): Promise<EntityRecord | null> => null);

const defaultEntityState = {
  items: [],
  totalCount: 0,
  nextCursor: null,
  page: 1,
  isLoading: false,
  error: null,
  listError: null,
  refresh: vi.fn(),
  isSubmitting: false,
  fieldErrors: {},
  create: createMock,
  update: vi.fn(),
  remove: vi.fn(),
  getById: vi.fn(),
};

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("../../hooks/useEntity", () => ({
  useEntity: vi.fn(() => defaultEntityState),
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

function createTwoStepWizardEntity(): EntityCatalogEntry {
  return {
    ...MOCK_ENTITY_CATALOG[0]!,
    ui: {
      ...MOCK_ENTITY_CATALOG[0]!.ui,
      forms: {
        presentation: "wizard",
        wizard: {
          shellLayout: createDefaultWizardShellLayout(),
          steps: [
            {
              id: "step-1",
              label: "Overview",
              layout: createEmptyLayout(1),
            },
            {
              id: "step-2",
              label: "Details",
              layout: createDefaultFormLayout(["name"]),
            },
          ],
        },
        create: {
          sections: [
            { title: "Details", fields: ["name", "email", "isActive"] },
          ],
        },
        edit: {
          sections: [
            { title: "Details", fields: ["name", "email", "isActive"] },
          ],
        },
      },
    },
  };
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
    vi.mocked(useEntity).mockReturnValueOnce({
      ...defaultEntityState,
      fieldErrors: { name: "Name is required." },
    });
    renderForm();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("submits create payloads", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
  });

  it("does not create when advancing to the wizard last step", async () => {
    createMock.mockClear();

    render(
      <TestEntityCatalogProvider items={[createTwoStepWizardEntity()]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create" }),
      ).toBeInTheDocument();
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it("keeps Create disabled on the wizard last step until required fields are valid", async () => {
    createMock.mockClear();

    render(
      <TestEntityCatalogProvider items={[createTwoStepWizardEntity()]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const createButton = await screen.findByRole("button", { name: "Create" });
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("submits optional wizard fields like description and tags", async () => {
    createMock.mockResolvedValueOnce({
      id: "widget-1",
      tenantId: "tenant-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      name: "Loan",
      description: "Product notes",
      tags: ["streaming"],
    });

    const wizardEntity: EntityCatalogEntry = {
      ...MOCK_ENTITY_CATALOG[0]!,
      fields: {
        ...MOCK_ENTITY_CATALOG[0]!.fields,
        description: { type: "string", required: false, optional: true },
        tags: {
          type: "string",
          required: false,
          optional: true,
          isArray: true,
        },
      },
      ui: {
        ...MOCK_ENTITY_CATALOG[0]!.ui,
        fields: {
          ...MOCK_ENTITY_CATALOG[0]!.ui.fields,
          description: { label: "Description", component: "input" },
          tags: { label: "Tags", component: "input" },
        },
        forms: {
          presentation: "wizard",
          wizard: {
            shellLayout: createDefaultWizardShellLayout(),
            steps: [
              {
                id: "step-1",
                label: "Details",
                layout: createDefaultFormLayout([
                  "name",
                  "description",
                  "tags",
                ]),
              },
            ],
          },
          create: {
            sections: [
              { title: "Details", fields: ["name", "email", "isActive"] },
            ],
          },
          edit: {
            sections: [
              { title: "Details", fields: ["name", "email", "isActive"] },
            ],
          },
        },
      },
    };

    render(
      <TestEntityCatalogProvider items={[wizardEntity]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Loan" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /description/i }), {
      target: { value: "Product notes" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /tags/i }), {
      target: { value: "streaming" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        name: "Loan",
        description: "Product notes",
        tags: ["streaming"],
      });
    });
  });

  it("creates and shows a success toast when the wizard last step is valid", async () => {
    createMock.mockResolvedValueOnce({
      id: "widget-1",
      tenantId: "tenant-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      name: "Acme",
    });
    vi.mocked(toast.success).mockClear();

    render(
      <TestEntityCatalogProvider items={[createTwoStepWizardEntity()]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const nameInput = await screen.findByRole("textbox");
    fireEvent.change(nameInput, { target: { value: "Acme" } });

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("publishes wizard modal footer when actions are placed in the footer", async () => {
    const onFooterChange = vi.fn();
    const wizardEntity: EntityCatalogEntry = {
      ...MOCK_ENTITY_CATALOG[0]!,
      ui: {
        ...MOCK_ENTITY_CATALOG[0]!.ui,
        forms: {
          presentation: "wizard",
          modalChrome: { showHeader: false, contentPadding: "none" },
          wizard: createDefaultWizardFormConfig(["name"]),
          create: {
            sections: [
              { title: "Details", fields: ["name", "email", "isActive"] },
            ],
          },
          edit: {
            sections: [
              { title: "Details", fields: ["name", "email", "isActive"] },
            ],
          },
        },
      },
    };

    render(
      <TestEntityCatalogProvider items={[wizardEntity]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityForm
              entityName="widget"
              mode="create"
              onCancel={vi.fn()}
              modalActionPlacement="footer"
              hideActions
              onFooterChange={onFooterChange}
            />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    await waitFor(() => {
      expect(onFooterChange).toHaveBeenCalled();
      expect(onFooterChange.mock.calls.at(-1)?.[0]).not.toBeNull();
    });
  });
});
