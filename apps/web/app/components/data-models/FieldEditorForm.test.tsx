import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldEditorForm } from "./FieldEditorForm";

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

describe("FieldEditorForm", () => {
  it("renders enum value inputs for enum fields", () => {
    render(
      <FieldEditorForm
        field={{
          name: "status",
          type: "enum",
          enumValues: ["Pending", "Approved"],
          required: true,
        }}
        relationTargets={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Pending")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Approved")).toBeInTheDocument();
  });

  it("calls onChange when field name is edited", () => {
    const onChange = vi.fn();

    render(
      <FieldEditorForm
        field={{ name: "amount", type: "number" }}
        relationTargets={[]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("amount"), {
      target: { value: "totalAmount" },
    });

    expect(onChange).toHaveBeenCalledWith({
      name: "totalAmount",
      type: "number",
    });
  });

  it("disables type select when typeReadOnly is true", () => {
    render(
      <FieldEditorForm
        field={{ name: "amount", type: "number" }}
        relationTargets={[]}
        onChange={vi.fn()}
        typeReadOnly
      />,
    );

    expect(screen.getByLabelText("dataModels.fieldType")).toBeDisabled();
  });

  it("auto-sets relation field name when target is selected", () => {
    const onChange = vi.fn();

    render(
      <FieldEditorForm
        field={{
          name: "",
          type: "relation",
          relation: { target: "", type: "many-to-one" },
        }}
        relationTargets={[{ name: "loan", label: "Loans" }]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("dataModels.relationTarget"), {
      target: { value: "loan" },
    });

    expect(onChange).toHaveBeenCalledWith({
      name: "loanId",
      type: "relation",
      relation: { target: "loan", type: "many-to-one" },
    });
  });

  it("updates filterable and sortable ui flags", () => {
    const onChange = vi.fn();

    render(
      <FieldEditorForm
        field={{
          name: "status",
          type: "string",
          ui: { filterable: true, sortable: true },
        }}
        relationTargets={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("dataModels.fieldFilterable"));

    expect(onChange).toHaveBeenCalledWith({
      name: "status",
      type: "string",
      ui: { filterable: false, sortable: true },
    });
  });

  it("defaults required checkbox to checked for new fields", () => {
    render(
      <FieldEditorForm
        field={{ name: "amount", type: "number", required: true }}
        relationTargets={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("dataModels.required")).toBeChecked();
  });
});
