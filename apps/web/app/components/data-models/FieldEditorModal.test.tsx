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

  it("imports field JSON into the draft", () => {
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

    fireEvent.click(screen.getByText("dataModels.json.importTrigger"));
    const importDialog = screen.getAllByRole("dialog").at(-1)!;
    fireEvent.change(importDialog.querySelector("textarea")!, {
      target: {
        value: JSON.stringify({
          kind: "field-definition",
          version: 1,
          data: {
            name: "principal",
            type: "number",
            required: true,
          },
        }),
      },
    });
    fireEvent.click(screen.getByText("dataModels.json.apply"));

    expect(screen.getByDisplayValue("principal")).toBeInTheDocument();
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

  it("saves relation fields with auto-generated names", () => {
    const onSave = vi.fn();

    render(
      <FieldEditorModal
        open
        mode="add"
        field={{ name: "", type: "string", required: true, ui: { order: 0 } }}
        orderDefault={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        canRemove={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("dataModels.fieldTypes.relation"));
    fireEvent.change(screen.getByLabelText("dataModels.relationTarget"), {
      target: { value: "loan" },
    });
    fireEvent.click(screen.getByText("entity.save"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "loanId",
        type: "relation",
        relation: { target: "loan", type: "many-to-one" },
      }),
    );
  });
});
