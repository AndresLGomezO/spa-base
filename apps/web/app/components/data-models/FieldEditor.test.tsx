import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldEditor } from "./FieldEditor";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

describe("FieldEditor", () => {
  it("renders enum value inputs for enum fields", () => {
    render(
      <FieldEditor
        field={{
          name: "status",
          type: "enum",
          enumValues: ["Pending", "Approved"],
          required: true,
        }}
        index={0}
        relationTargets={[]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    expect(screen.getByDisplayValue("Pending")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Approved")).toBeInTheDocument();
  });

  it("renders relation target select for relation fields", () => {
    render(
      <FieldEditor
        field={{
          name: "widgetId",
          type: "relation",
          relation: { target: "widget", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[
          { name: "widget", label: "Widgets" },
          { name: "testItem", label: "Test Items" },
        ]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove
      />,
    );

    expect(
      screen.getByLabelText("dataModels.relationTarget"),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Widgets" })).toBeInTheDocument();
  });

  it("calls onChange when field name is edited", () => {
    const onChange = vi.fn();

    render(
      <FieldEditor
        field={{ name: "amount", type: "number" }}
        index={0}
        relationTargets={[]}
        onChange={onChange}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("amount"), {
      target: { value: "totalAmount" },
    });

    expect(onChange).toHaveBeenCalledWith(0, {
      name: "totalAmount",
      type: "number",
    });
  });

  it("auto-sets relation field name and disables input when target is selected", () => {
    const onChange = vi.fn();

    render(
      <FieldEditor
        field={{
          name: "",
          type: "relation",
          relation: { target: "", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={onChange}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("dataModels.relationTarget"), {
      target: { value: "loan" },
    });

    expect(onChange).toHaveBeenCalledWith(0, {
      name: "loanId",
      type: "relation",
      relation: { target: "loan", type: "many-to-one" },
    });

    render(
      <FieldEditor
        field={{
          name: "loanId",
          type: "relation",
          relation: { target: "loan", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    expect(screen.getByDisplayValue("loanId")).toBeDisabled();
  });

  it("allows custom relation field name via override checkbox", () => {
    const onChange = vi.fn();

    render(
      <FieldEditor
        field={{
          name: "loanId",
          type: "relation",
          relation: { target: "loan", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={onChange}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    const nameInput = screen.getByDisplayValue("loanId");
    expect(nameInput).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText("dataModels.customRelationFieldName"),
    );

    expect(nameInput).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "borrowedLoanId" } });
    expect(onChange).toHaveBeenCalledWith(0, {
      name: "borrowedLoanId",
      type: "relation",
      relation: { target: "loan", type: "many-to-one" },
    });
  });

  it("restores generated name when override checkbox is unchecked", () => {
    const onChange = vi.fn();

    render(
      <FieldEditor
        field={{
          name: "customRef",
          type: "relation",
          relation: { target: "loan", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={onChange}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    fireEvent.click(
      screen.getByLabelText("dataModels.customRelationFieldName"),
    );

    expect(onChange).toHaveBeenCalledWith(0, {
      name: "loanId",
      type: "relation",
      relation: { target: "loan", type: "many-to-one" },
    });
  });

  it("updates name to plural form when relation type changes to many-to-many", () => {
    const onChange = vi.fn();

    render(
      <FieldEditor
        field={{
          name: "loanId",
          type: "relation",
          relation: { target: "loan", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={onChange}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("dataModels.relationType"), {
      target: { value: "many-to-many" },
    });

    expect(onChange).toHaveBeenCalledWith(0, {
      name: "loans",
      type: "relation",
      relation: { target: "loan", type: "many-to-many" },
    });
  });

  it("shows relation type help popover for the selected type", () => {
    render(
      <FieldEditor
        field={{
          name: "loanId",
          type: "relation",
          relation: { target: "loan", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove={false}
      />,
    );

    fireEvent.click(screen.getByLabelText("dataModels.relationTypeInfoLabel"));

    expect(
      screen.getByText("dataModels.relationTypes.manyToOne.description"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/dataModels\.relationTypes\.manyToOne\.example/),
    ).toBeInTheDocument();
  });
});
