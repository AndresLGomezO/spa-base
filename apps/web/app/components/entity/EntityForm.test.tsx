import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { createDefaultFormLayout } from "@repo/entities";
import {
  addComponentRowAt,
  createDefaultComponent,
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
import { EntityFormModalProvider } from "./entity-form-modal-context";
import { EntitySaveManagerProvider } from "../../features/entity-save/entity-save-context";
import { useEntity, type EntityRecord } from "../../hooks/useEntity";
import { createEntity, getEntity } from "../../lib/api-client";

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

vi.mock("../../lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api-client")>();
  return {
    ...actual,
    getEntity: vi.fn(),
    createEntity: vi.fn(async () => ({
      id: "widget-1",
      tenantId: "tenant-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
    getEntityRelationTargets: vi.fn(async () => []),
    syncEntityRelationTargets: vi.fn(async () => undefined),
  };
});

function TestEntityFormProviders({
  children,
  items = MOCK_ENTITY_CATALOG,
}: {
  readonly children: React.ReactNode;
  readonly items?: readonly EntityCatalogEntry[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <TestEntityCatalogProvider items={items}>
      <QueryClientProvider client={queryClient}>
        <EntityFormModalProvider>
          <EntitySaveManagerProvider>
            <MemoryRouter>
              <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
            </MemoryRouter>
          </EntitySaveManagerProvider>
        </EntityFormModalProvider>
      </QueryClientProvider>
    </TestEntityCatalogProvider>
  );
}

function renderForm() {
  return render(
    <TestEntityFormProviders>
      <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
    </TestEntityFormProviders>,
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

const contractCatalogEntry: EntityCatalogEntry = {
  name: "contract",
  collection: "contracts",
  permissions: ["contract.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
    providerId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "provider" },
    },
  },
  ui: {
    views: [],
    forms: {
      create: { sections: [{ title: "Details", fields: ["name"] }] },
      edit: { sections: [{ title: "Details", fields: ["name"] }] },
    },
    fields: {},
  },
};

const providerCatalogEntry: EntityCatalogEntry = {
  name: "provider",
  collection: "providers",
  permissions: ["provider.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: {
      create: { sections: [{ title: "Details", fields: ["name"] }] },
      edit: { sections: [{ title: "Details", fields: ["name"] }] },
    },
    fields: {},
  },
};

function createPaymentCreateLayout() {
  const locator = { scope: "root" as const, columnIndex: 0 };
  let layout = createEmptyLayout(1);
  layout = addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("text", "contract.name"),
  );
  layout = addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("form-field", "amount"),
  );
  return layout;
}

function createTransactionCreateLayout() {
  const locator = { scope: "root" as const, columnIndex: 0 };
  let layout = createEmptyLayout(1);
  layout = addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("text", "contract.provider.name"),
  );
  layout = addComponentRowAt(
    layout,
    locator,
    createDefaultComponent("form-field", "amount"),
  );
  return layout;
}

const paymentWithContractDisplay: EntityCatalogEntry = {
  name: "payment",
  collection: "payments",
  permissions: ["payment.read", "payment.create"],
  fields: {
    amount: { type: "number", required: true, optional: false },
    contractId: {
      type: "reference",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "contract" },
    },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["amount"] }],
    forms: {
      create: { layout: createPaymentCreateLayout() },
      edit: { sections: [{ title: "Details", fields: ["amount"] }] },
    },
    fields: {
      amount: { label: "Amount", component: "number" },
      contractId: { label: "Contract", component: "relation" },
    },
  },
};

const transactionWithNestedDisplay: EntityCatalogEntry = {
  name: "transaction",
  collection: "transactions",
  permissions: ["transaction.read", "transaction.create"],
  fields: {
    amount: { type: "number", required: true, optional: false },
    contractId: {
      type: "reference",
      required: true,
      optional: false,
      relation: { type: "many-to-one", target: "contract" },
    },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["amount"] }],
    forms: {
      create: { layout: createTransactionCreateLayout() },
      edit: { sections: [{ title: "Details", fields: ["amount"] }] },
    },
    fields: {
      amount: { label: "Amount", component: "number" },
      contractId: { label: "Contract", component: "relation" },
    },
  },
};

describe("EntityForm", () => {
  it("renders designed create layout with form-field widgets", () => {
    render(
      <TestEntityFormProviders items={[widgetWithDesignedCreateForm]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
    );

    expect(document.getElementById("widget-name")).toBeInTheDocument();
    expect(document.getElementById("widget-email")).toBeInTheDocument();
    expect(document.getElementById("widget-isActive")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("renders prefilled relation display components on create", async () => {
    render(
      <TestEntityFormProviders
        items={[
          paymentWithContractDisplay,
          contractCatalogEntry,
          providerCatalogEntry,
        ]}
      >
        <EntityForm
          entityName="payment"
          mode="create"
          createPrefill={{ contractId: "contract-1" }}
          createPrefillPopulated={{
            contractId: { id: "contract-1", name: "Annual contract" },
          }}
          onCancel={vi.fn()}
        />
      </TestEntityFormProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText("Annual contract")).toBeInTheDocument();
    });
    expect(getEntity).not.toHaveBeenCalled();
  });

  it("renders three-hop prefilled relation display components on create", async () => {
    render(
      <TestEntityFormProviders
        items={[
          transactionWithNestedDisplay,
          contractCatalogEntry,
          providerCatalogEntry,
        ]}
      >
        <EntityForm
          entityName="transaction"
          mode="create"
          createPrefill={{ contractId: "contract-1" }}
          createPrefillPopulated={{
            contractId: {
              id: "contract-1",
              providerId: "provider-1",
              _populated: {
                providerId: { id: "provider-1", name: "Acme Provider" },
              },
            },
          }}
          onCancel={vi.fn()}
        />
      </TestEntityFormProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Provider")).toBeInTheDocument();
    });
    expect(getEntity).not.toHaveBeenCalled();
  });

  it("shows validation errors from the entity hook", () => {
    vi.mocked(useEntity).mockReturnValueOnce({
      ...defaultEntityState,
      fieldErrors: { name: "Name is required." },
    });
    renderForm();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("shows validation summary for hidden field errors", () => {
    let layout = createDefaultFormLayout(["name"]);
    layout = {
      ...layout,
      root: {
        ...layout.root,
        columns: [
          {
            ...layout.root.columns[0]!,
            rows: [
              {
                type: "component",
                id: "hidden-category",
                component: {
                  kind: "form-field",
                  fieldPath: "categoryId",
                  hidden: true,
                },
              },
              ...layout.root.columns[0]!.rows,
            ],
          },
        ],
      },
    };

    const entityWithHiddenField: EntityCatalogEntry = {
      ...widgetWithDesignedCreateForm,
      fields: {
        ...widgetWithDesignedCreateForm.fields,
        categoryId: { type: "string", required: true, optional: false },
      },
      ui: {
        ...widgetWithDesignedCreateForm.ui,
        forms: {
          ...widgetWithDesignedCreateForm.ui.forms,
          create: {
            ...widgetWithDesignedCreateForm.ui.forms.create,
            layout,
          },
          edit: {
            ...widgetWithDesignedCreateForm.ui.forms.edit,
            layout,
          },
        },
      },
    };

    vi.mocked(useEntity).mockReturnValueOnce({
      ...defaultEntityState,
      fieldErrors: {
        categoryId: "Invalid input: expected string, received undefined",
      },
    });

    render(
      <TestEntityFormProviders items={[entityWithHiddenField]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
    );

    expect(
      screen.getByText(
        "Category Id: Invalid input: expected string, received undefined",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/category id/i)).not.toBeInTheDocument();
  });

  it("submits create payloads", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createEntity).toHaveBeenCalled();
    });
  });

  it("does not create when advancing to the wizard last step", async () => {
    vi.mocked(createEntity).mockClear();

    render(
      <TestEntityFormProviders items={[createTwoStepWizardEntity()]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create" }),
      ).toBeInTheDocument();
    });

    expect(createEntity).not.toHaveBeenCalled();
  });

  it("keeps Create disabled on the wizard last step until required fields are valid", async () => {
    vi.mocked(createEntity).mockClear();

    render(
      <TestEntityFormProviders items={[createTwoStepWizardEntity()]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const createButton = await screen.findByRole("button", { name: "Create" });
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(createEntity).not.toHaveBeenCalled();
  });

  it("submits optional wizard fields like description and tags", async () => {
    vi.mocked(createEntity).mockResolvedValueOnce({
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
      <TestEntityFormProviders items={[wizardEntity]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
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
      expect(createEntity).toHaveBeenCalledWith("widget", {
        name: "Loan",
        description: "Product notes",
        tags: ["streaming"],
      });
    });
  });

  it("creates and shows a success toast when the wizard last step is valid", async () => {
    vi.mocked(createEntity).mockResolvedValueOnce({
      id: "widget-1",
      tenantId: "tenant-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      name: "Acme",
    });
    vi.mocked(toast.success).mockClear();

    render(
      <TestEntityFormProviders items={[createTwoStepWizardEntity()]}>
        <EntityForm entityName="widget" mode="create" onCancel={vi.fn()} />
      </TestEntityFormProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const nameInput = await screen.findByRole("textbox");
    fireEvent.change(nameInput, { target: { value: "Acme" } });

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createEntity).toHaveBeenCalled();
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
      <TestEntityFormProviders items={[wizardEntity]}>
        <EntityForm
          entityName="widget"
          mode="create"
          onCancel={vi.fn()}
          modalActionPlacement="footer"
          hideActions
          onFooterChange={onFooterChange}
        />
      </TestEntityFormProviders>,
    );

    await waitFor(() => {
      expect(onFooterChange).toHaveBeenCalled();
      expect(onFooterChange.mock.calls.at(-1)?.[0]).not.toBeNull();
    });
  });
});
