import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { HookManager } from "./HookManager";

const mockListHooks = vi.fn();

vi.mock("../../lib/api-client", () => ({
  listHooks: (...args: unknown[]) => mockListHooks(...args),
}));

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: [{ name: "loan", label: "Loans", fields: [] }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("HookManager", () => {
  it("loads and lists hooks", async () => {
    mockListHooks.mockResolvedValue({
      items: [
        {
          id: "hook_1",
          tenantId: "tenant_a",
          name: "Set status",
          entity: "loan",
          event: "loan.beforeCreate",
          type: "action",
          config: {
            actions: [{ type: "updateField", field: "status", value: "draft" }],
          },
          enabled: true,
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    render(
      <MemoryRouter>
        <HookManager tenantId="tenant_a" canCreate canUpdate />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Set status")).toBeInTheDocument();
    });

    expect(screen.getByText("loan.beforeCreate")).toBeInTheDocument();
  });
});
