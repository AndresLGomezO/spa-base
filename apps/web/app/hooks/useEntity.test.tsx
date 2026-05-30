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

vi.mock("../entities/entity-catalog-context", () => ({
  useEntityDefinition: vi.fn(() => ({
    name: "widget",
    collection: "widgets",
    permissions: [],
    fields: {},
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
    },
  })),
}));

import {
  createEntity,
  deleteEntity,
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
      limit: 20,
      cursor: undefined,
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
