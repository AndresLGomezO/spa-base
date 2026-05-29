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
          name: "organizationId",
          type: "relation",
          relation: { target: "organization", type: "many-to-one" },
        }}
        index={0}
        relationTargets={[
          { name: "organization", label: "Organizations" },
          { name: "project", label: "Projects" },
        ]}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        canRemove
      />,
    );

    expect(
      screen.getByLabelText("dataModels.relationTarget"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Organizations" }),
    ).toBeInTheDocument();
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
});
