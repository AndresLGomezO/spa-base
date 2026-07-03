import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DebugEventSource } from "../../lib/api-client";
import { DebuggerProvider, useDebugger } from "./debugger-context";
import { TENANT_INDEX_PROCESS_LIST_QUERY_KEY } from "./hooks/useIndexProvisioningJobs";

const mockListDebugEvents = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "tenant-1",
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../lib/api-client", () => ({
  listDebugEvents: (...args: unknown[]) => mockListDebugEvents(...args),
}));

const emptyPage = {
  items: [],
  nextCursor: undefined,
};

function createWrapper(activeSource: DebugEventSource = "hookExecution") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DebuggerProvider activeSource={activeSource}>
            {children}
          </DebuggerProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { wrapper: Wrapper, invalidateSpy };
}

describe("debugger refresh state", () => {
  beforeEach(() => {
    mockListDebugEvents.mockReset();
    mockListDebugEvents.mockResolvedValue(emptyPage);
  });

  it("sets isRefreshing while manual refresh is in flight", async () => {
    let resolveRefetch!: (value: typeof emptyPage) => void;
    mockListDebugEvents.mockResolvedValueOnce(emptyPage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        }),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDebugger(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));

    await act(async () => {
      resolveRefetch(emptyPage);
      await refreshPromise;
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshGeneration).toBe(1);
  });

  it("invalidates index provisioning query on refresh", async () => {
    const { wrapper, invalidateSpy } = createWrapper("indexProvision");
    const { result } = renderHook(() => useDebugger(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [TENANT_INDEX_PROCESS_LIST_QUERY_KEY],
    });
  });
});
