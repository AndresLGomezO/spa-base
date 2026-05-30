import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldEditorModal } from "./FieldEditorModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("FieldEditorModal", () => {
  it("shows type picker first when adding a field", () => {
    render(
      <FieldEditorModal
        open
        mode="add"
        field={{ name: "", type: "string", required: false, ui: { order: 0 } }}
        orderDefault={0}
        relationTargets={[]}
        canRemove={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText("dataModels.fieldTypes.number"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("dataModels.fieldName"),
    ).not.toBeInTheDocument();
  });

  it("moves to details step after selecting a type", () => {
    render(
      <FieldEditorModal
        open
        mode="add"
        field={{ name: "", type: "string", required: false, ui: { order: 0 } }}
        orderDefault={0}
        relationTargets={[]}
        canRemove={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("dataModels.fieldTypes.number"));
    expect(screen.getByLabelText("dataModels.fieldName")).toBeInTheDocument();
  });

  it("shows read-only type when editing", () => {
    render(
      <FieldEditorModal
        open
        mode="edit"
        field={{ name: "amount", type: "number", required: true }}
        orderDefault={0}
        relationTargets={[]}
        canRemove={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("dataModels.fieldType")).toBeDisabled();
    expect(screen.getByDisplayValue("amount")).toBeInTheDocument();
  });

  it("keeps typed edits when parent passes a new field object reference", () => {
    const field = { name: "amount", type: "number" as const, required: true };
    const { rerender } = render(
      <FieldEditorModal
        open
        mode="edit"
        field={field}
        orderDefault={0}
        relationTargets={[]}
        canRemove={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText("dataModels.fieldName");
    fireEvent.change(nameInput, { target: { value: "amountDue" } });
    expect(nameInput).toHaveValue("amountDue");

    rerender(
      <FieldEditorModal
        open
        mode="edit"
        field={{ ...field }}
        orderDefault={0}
        relationTargets={[]}
        canRemove={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("dataModels.fieldName")).toHaveValue(
      "amountDue",
    );
  });
});
