import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityField } from "./EntityField";

describe("EntityField", () => {
  it("renders a text input for string fields", () => {
    render(
      <EntityField
        entityName="customer"
        fieldName="name"
        value="Jane"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Jane");
  });

  it("renders a checkbox for boolean fields", () => {
    const onChange = vi.fn();

    render(
      <EntityField
        entityName="customer"
        fieldName="isActive"
        value={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith("isActive", true);
  });
});
