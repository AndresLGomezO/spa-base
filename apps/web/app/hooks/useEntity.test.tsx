import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api-client", () => ({
  listEntity: vi.fn(),
  getEntity: vi.fn(),
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  deleteEntity: vi.fn(),
  isApiClientError: vi.fn(() => false),
}));

const mockUseEntityDefinition = vi.fn(() => ({
  name: "widget",
  collection: "widgets",
  permissions: [],
  fields: {},
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
}));

vi.mock("../entities/entity-catalog-context", () => ({
  useEntityDefinition: () => mockUseEntityDefinition(),
}));

import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntity,
  updateEntity,
} from "../lib/api-client";
import { useEntity } from "./useEntity";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useEntity", () => {
  beforeEach(() => {
    mockUseEntityDefinition.mockReturnValue({
      name: "widget",
      collection: "widgets",
      permissions: [],
      fields: {},
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    });
    vi.mocked(listEntity).mockResolvedValue({
      items: [
        {
          id: "1",
          tenantId: "tenant_a",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          name: "Jane",
        },
      ],
      nextCursor: null,
      totalCount: 1,
    });
  });

  it("loads entity list on mount", async () => {
    const { result } = renderHook(() => useEntity("widget"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(listEntity).toHaveBeenCalledWith("widget", {
      query: undefined,
    });
  });

  it("creates records through the API", async () => {
    vi.mocked(createEntity).mockResolvedValue({
      id: "2",
      tenantId: "tenant_a",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      name: "New",
    });

    const { result } = renderHook(() => useEntity("widget"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const created = await result.current.create({ name: "New" });
    expect(created?.id).toBe("2");
  });

  it("loads a record by id with relation populate params", async () => {
    mockUseEntityDefinition.mockReturnValue({
      name: "contract",
      collection: "contracts",
      permissions: [],
      fields: {
        categoryId: {
          type: "relation",
          relation: { target: "category", type: "many-to-one" },
        },
        providerId: {
          type: "relation",
          relation: { target: "provider", type: "many-to-one" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    });
    vi.mocked(getEntity).mockResolvedValue({
      id: "contract_1",
      tenantId: "tenant_a",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      categoryId: "cat_1",
      providerId: "prov_1",
      _populated: {
        categoryId: { id: "cat_1", name: "Retail" },
        providerId: { id: "prov_1", name: "Acme Provider" },
      },
    });

    const { result } = renderHook(() => useEntity("contract"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const record = await result.current.getById("contract_1");

    expect(getEntity).toHaveBeenCalledWith("contract", "contract_1", {
      populate: "categoryId,providerId",
    });
    expect(record?._populated).toEqual({
      categoryId: { id: "cat_1", name: "Retail" },
      providerId: { id: "prov_1", name: "Acme Provider" },
    });
  });

  it("deletes records through the API", async () => {
    vi.mocked(deleteEntity).mockResolvedValue({ deleted: true });

    const { result } = renderHook(() => useEntity("widget"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const deleted = await result.current.remove("1");
    expect(deleted).toBe(true);
    expect(updateEntity).not.toHaveBeenCalled();
  });
});
