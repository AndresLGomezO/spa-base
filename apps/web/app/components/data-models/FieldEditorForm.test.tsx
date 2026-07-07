import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { selectAdminSelectOption } from "../../test/admin-select-test-utils";
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

    selectAdminSelectOption("dataModels.relationTarget", "Loans");

    expect(onChange).toHaveBeenCalledWith({
      name: "loanId",
      type: "relation",
      relation: { target: "loan", type: "many-to-one" },
    });
  });

  it("renders searchable checkbox for string fields", () => {
    render(
      <FieldEditorForm
        field={{ name: "title", type: "string" }}
        relationTargets={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("dataModels.fieldSearchable"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("dataModels.fieldSearchable")).toBeChecked();
  });

  it("does not render searchable checkbox for number fields", () => {
    render(
      <FieldEditorForm
        field={{ name: "amount", type: "number" }}
        relationTargets={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("dataModels.fieldSearchable"),
    ).not.toBeInTheDocument();
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

  it("updates searchable ui flag", () => {
    const onChange = vi.fn();

    render(
      <FieldEditorForm
        field={{
          name: "title",
          type: "string",
          ui: { searchable: true },
        }}
        relationTargets={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("dataModels.fieldSearchable"));

    expect(onChange).toHaveBeenCalledWith({
      name: "title",
      type: "string",
      ui: { searchable: false },
    });
  });

  it("renders number kind and percentage display options for number fields", () => {
    const onChange = vi.fn();

    render(
      <FieldEditorForm
        field={{
          name: "rate",
          type: "number",
          numberKind: "decimal",
          ui: { displayFormat: "percentage" },
        }}
        relationTargets={[]}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("dataModels.numberKind")).toHaveValue(
      "dataModels.numberKinds.decimal",
    );
    expect(screen.getByLabelText("dataModels.numberDisplayFormat")).toHaveValue(
      "dataModels.numberDisplayFormats.percentage",
    );

    selectAdminSelectOption(
      "dataModels.numberKind",
      "dataModels.numberKinds.integer",
    );

    expect(onChange).toHaveBeenCalledWith({
      name: "rate",
      type: "number",
      numberKind: "integer",
      ui: { displayFormat: "percentage" },
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

  it("renders max size and default image controls for image fields", () => {
    render(
      <FieldEditorForm
        field={{ name: "logo", type: "image", maxSizeBytes: 2_097_152 }}
        entityName="brand"
        relationTargets={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("dataModels.maxFileSizeMb"),
    ).toBeInTheDocument();
    expect(screen.getByText("dataModels.defaultImage")).toBeInTheDocument();
  });
});
