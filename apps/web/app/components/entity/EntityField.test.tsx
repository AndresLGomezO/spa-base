import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { EntityField } from "./EntityField";

describe("EntityField", () => {
  it("renders a text input for string fields", () => {
    render(
      <TestEntityCatalogProvider>
        <EntityField
          entityName="organization"
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
          entityName="organization"
          fieldName="isActive"
          value={false}
          onChange={onChange}
        />
      </TestEntityCatalogProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith("isActive", true);
  });
});
