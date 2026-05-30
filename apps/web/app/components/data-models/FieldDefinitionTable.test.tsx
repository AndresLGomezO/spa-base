import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldDefinitionTable } from "./FieldDefinitionTable";

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

describe("FieldDefinitionTable", () => {
  it("renders rows sorted by display order", () => {
    render(
      <FieldDefinitionTable
        fields={[
          { name: "amount", type: "number", ui: { order: 2 } },
          { name: "status", type: "string", ui: { order: 0 } },
          { name: "name", type: "string", ui: { order: 1 } },
        ]}
        canEdit
        onEdit={vi.fn()}
      />,
    );

    const names = screen
      .getAllByText(/^(status|name|amount)$/)
      .map((node) => node.textContent);
    expect(names).toEqual(["status", "name", "amount"]);
  });

  it("calls onEdit when edit is clicked", () => {
    const onEdit = vi.fn();

    render(
      <FieldDefinitionTable
        fields={[{ name: "amount", type: "number" }]}
        canEdit
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByLabelText("dataModels.editField"));
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it("shows empty state when there are no fields", () => {
    render(<FieldDefinitionTable fields={[]} canEdit onEdit={vi.fn()} />);

    expect(screen.getByText("dataModels.fieldsTableEmpty")).toBeInTheDocument();
  });
});
