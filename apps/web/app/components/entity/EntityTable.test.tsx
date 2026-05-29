import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../../i18n";
import { EntityTable } from "./EntityTable";

vi.mock("../../hooks/useEntityPermissions", () => ({
  useEntityPermissions: vi.fn(() => ({
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  })),
}));

function renderTable() {
  return render(
    <I18nextProvider i18n={i18n}>
      <EntityTable
        entityName="customer"
        items={[
          {
            id: "cust_1",
            name: "Jane Doe",
            email: "jane@example.com",
            isActive: true,
          },
        ]}
        isLoading={false}
        error={null}
        nextCursor={null}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onDelete={vi.fn()}
      />
    </I18nextProvider>,
  );
}

describe("EntityTable", () => {
  it("renders records for viewer permissions without actions", () => {
    renderTable();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
