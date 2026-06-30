import {
  addComponentRowAt,
  createDefaultWizardShellLayout,
  createEmptyLayout,
  type FormFieldComponentConfig,
} from "@repo/ui-builder-core";
import { createDefaultFormLayout } from "@repo/entities";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { i18n } from "../../i18n";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityWizardForm } from "./EntityWizardForm";

const definition = {
  name: "transaction",
  collection: "transactions",
  permissions: ["transaction.read"],
  fields: {
    categoryId: { type: "string", required: true, optional: false },
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name"] }],
    forms: {
      create: { layout: createDefaultFormLayout(["name"]) },
      edit: { layout: createDefaultFormLayout(["name"]) },
    },
  },
} as const;

const hiddenCategoryField: FormFieldComponentConfig = {
  kind: "form-field",
  fieldPath: "categoryId",
  hidden: true,
};

const stepOneLayout = createEmptyLayout(1);
const stepTwoLayout = addComponentRowAt(
  createEmptyLayout(1),
  { scope: "root", columnIndex: 0 },
  hiddenCategoryField,
);

function renderWizard(fieldErrors: Record<string, string>) {
  return render(
    <TestEntityCatalogProvider items={[]}>
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <EntityWizardForm
            entityName="transaction"
            definition={definition}
            mode="create"
            wizard={{
              shellLayout: createDefaultWizardShellLayout(),
              steps: [
                {
                  id: "overview",
                  label: "Overview",
                  layout: stepOneLayout,
                },
                {
                  id: "details",
                  label: "Details",
                  layout: stepTwoLayout,
                },
              ],
            }}
            locale="en"
            values={{ categoryId: "", name: "" }}
            fieldErrors={fieldErrors}
            fieldAccess={{}}
            canRead
            canWrite
            onChange={vi.fn()}
            onCancel={vi.fn()}
            cancelLabel="Cancel"
            saveLabel="Create"
            onSubmit={vi.fn()}
          />
        </I18nextProvider>
      </MemoryRouter>
    </TestEntityCatalogProvider>,
  );
}

describe("EntityWizardForm", () => {
  it("navigates to the step containing the first server field error", () => {
    const { rerender } = renderWizard({});

    expect(screen.queryByText(/Category Id:/)).not.toBeInTheDocument();

    rerender(
      <TestEntityCatalogProvider items={[]}>
        <MemoryRouter>
          <I18nextProvider i18n={i18n}>
            <EntityWizardForm
              entityName="transaction"
              definition={definition}
              mode="create"
              wizard={{
                shellLayout: createDefaultWizardShellLayout(),
                steps: [
                  {
                    id: "overview",
                    label: "Overview",
                    layout: stepOneLayout,
                  },
                  {
                    id: "details",
                    label: "Details",
                    layout: stepTwoLayout,
                  },
                ],
              }}
              locale="en"
              values={{ categoryId: "", name: "" }}
              fieldErrors={{
                categoryId:
                  "Invalid input: expected string, received undefined",
              }}
              fieldAccess={{}}
              canRead
              canWrite
              onChange={vi.fn()}
              onCancel={vi.fn()}
              cancelLabel="Cancel"
              saveLabel="Create"
              onSubmit={vi.fn()}
            />
          </I18nextProvider>
        </MemoryRouter>
      </TestEntityCatalogProvider>,
    );

    expect(
      screen.getByText(
        "Category Id: Invalid input: expected string, received undefined",
      ),
    ).toBeInTheDocument();
  });
});
