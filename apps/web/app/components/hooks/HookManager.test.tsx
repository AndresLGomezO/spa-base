import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListHooks } = vi.hoisted(() => ({
  mockListHooks: vi.fn(),
}));

vi.mock("../../lib/api-client", () => ({
  listHooks: mockListHooks,
}));

import { HookManager } from "./HookManager";

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

const mockT = (key: string) => key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

describe("HookManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    expect(await screen.findByText("Set status")).toBeInTheDocument();

    expect(screen.getByText("loan.beforeCreate")).toBeInTheDocument();
  });
});
