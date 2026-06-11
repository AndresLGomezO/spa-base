import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { MOCK_ENTITY_CATALOG } from "../../test/entity-catalog-fixtures";
import { EntityField } from "./EntityField";

const WIDGET_WITH_DATE: EntityCatalogEntry = {
  ...MOCK_ENTITY_CATALOG[0]!,
  fields: {
    ...MOCK_ENTITY_CATALOG[0]!.fields,
    dueDate: { type: "date", required: false, optional: true },
  },
  ui: {
    ...MOCK_ENTITY_CATALOG[0]!.ui,
    fields: {
      ...MOCK_ENTITY_CATALOG[0]!.ui.fields,
      dueDate: {
        label: "Due date",
        component: "date",
        dateDisplayFormat: "date",
      },
    },
  },
};

describe("EntityField", () => {
  it("renders a text input for string fields", () => {
    render(
      <TestEntityCatalogProvider>
        <EntityField
          entityName="widget"
          fieldName="name"
          value="Jane"
          onChange={vi.fn()}
        />
      </TestEntityCatalogProvider>,
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Jane");
  });

  it("renders a checkbox for boolean fields", () => {
    const onChange = vi.fn();

    render(
      <TestEntityCatalogProvider>
        <EntityField
          entityName="widget"
          fieldName="isActive"
          value={false}
          onChange={onChange}
        />
      </TestEntityCatalogProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith("isActive", true);
  });

  it("renders a squared Yes/No selector when booleanFieldOptions requests squared switch", () => {
    const onChange = vi.fn();

    render(
      <TestEntityCatalogProvider>
        <EntityField
          entityName="widget"
          fieldName="isActive"
          value={false}
          booleanFieldOptions={{ display: "switch", switchVariant: "squared" }}
          onChange={onChange}
        />
      </TestEntityCatalogProvider>,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Yes" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: "No" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).toHaveBeenCalledWith("isActive", true);
  });

  it("renders array field entry and badges for string arrays", () => {
    const onChange = vi.fn();
    const widgetWithTags: EntityCatalogEntry = {
      ...MOCK_ENTITY_CATALOG[0]!,
      fields: {
        ...MOCK_ENTITY_CATALOG[0]!.fields,
        tags: {
          type: "string",
          isArray: true,
          required: false,
          optional: true,
        },
      },
      ui: {
        ...MOCK_ENTITY_CATALOG[0]!.ui,
        fields: {
          ...MOCK_ENTITY_CATALOG[0]!.ui.fields,
          tags: { label: "Tags", component: "input" },
        },
      },
    };

    render(
      <TestEntityCatalogProvider items={[widgetWithTags]}>
        <EntityField
          entityName="widget"
          fieldName="tags"
          value={["alpha"]}
          onChange={onChange}
        />
      </TestEntityCatalogProvider>,
    );

    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add value/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Tags/i), {
      target: { value: "beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add value/i }));

    expect(onChange).toHaveBeenCalledWith("tags", ["alpha", "beta"]);
  });

  it("renders a date picker for date fields", () => {
    render(
      <TestEntityCatalogProvider items={[WIDGET_WITH_DATE]}>
        <EntityField
          entityName="widget"
          fieldName="dueDate"
          value="2025-03-15T00:00:00.000Z"
          onChange={vi.fn()}
        />
      </TestEntityCatalogProvider>,
    );

    expect(screen.getByLabelText(/Due date/i)).toHaveValue("03/15/2025");
  });
});
