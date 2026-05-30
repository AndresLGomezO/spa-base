import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityFieldsManager } from "./EntityFieldsManager";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EntityFieldsManager", () => {
  it("adds a field through the nested modal flow", () => {
    const onChange = vi.fn();

    render(
      <EntityFieldsManager
        fields={[]}
        onChange={onChange}
        canEdit
        relationTargets={[]}
      />,
    );

    fireEvent.click(screen.getByText("dataModels.addField"));
    fireEvent.click(screen.getByText("dataModels.fieldTypes.string"));
    fireEvent.change(screen.getByLabelText("dataModels.fieldName"), {
      target: { value: "title" },
    });
    fireEvent.click(screen.getByText("entity.save"));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: "title", type: "string" }),
    ]);
  });

  it("opens edit modal for an existing field", () => {
    render(
      <EntityFieldsManager
        fields={[{ name: "amount", type: "number", required: true }]}
        onChange={vi.fn()}
        canEdit
        relationTargets={[]}
      />,
    );

    fireEvent.click(screen.getByLabelText("dataModels.editField"));
    expect(screen.getByText("dataModels.editFieldTitle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("amount")).toBeInTheDocument();
  });
});
