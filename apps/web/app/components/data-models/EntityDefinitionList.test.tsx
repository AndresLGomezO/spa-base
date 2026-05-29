import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityDefinitionList } from "./EntityDefinitionList";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EntityDefinitionList", () => {
  it("renders existing models and create action", () => {
    render(
      <EntityDefinitionList
        items={[
          {
            id: "def_1",
            tenantId: "tenant_a",
            name: "loan",
            label: "Loans",
            fields: [{ name: "amount", type: "number", required: true }],
            version: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
        isLoading={false}
        canCreate
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByText("loan")).toBeInTheDocument();
    expect(screen.getByText("Loans")).toBeInTheDocument();
    expect(screen.getByText("dataModels.createModel")).toBeInTheDocument();
  });
});
