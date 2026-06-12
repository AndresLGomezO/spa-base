import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../lib/api-client", () => ({
  listEntities: vi.fn(),
}));

import { listEntities } from "../lib/api-client";
import { MOCK_ENTITY_CATALOG } from "../test/entity-catalog-fixtures";
import {
  EntityCatalogProvider,
  useEntityCatalog,
} from "./entity-catalog-context";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <EntityCatalogProvider>{children}</EntityCatalogProvider>
      </QueryClientProvider>
    );
  };
}

describe("EntityCatalogProvider", () => {
  beforeEach(() => {
    vi.mocked(listEntities).mockResolvedValue({
      items: MOCK_ENTITY_CATALOG,
    });
  });

  it("does not fetch the catalog until tenantId is available", async () => {
    mockUseAuth.mockReturnValue({
      tenantId: null,
      isSessionResolved: true,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEntityCatalog(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(listEntities).not.toHaveBeenCalled();
  });

  it("fetches the catalog once tenantId is resolved", async () => {
    mockUseAuth.mockReturnValue({
      tenantId: "tenant_a",
      isSessionResolved: true,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useEntityCatalog(), { wrapper });

    await waitFor(() => {
      expect(listEntities).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.name).toBe("widget");
    });
  });
});
