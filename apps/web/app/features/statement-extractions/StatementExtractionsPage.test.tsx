import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatementExtractionsPage } from "./StatementExtractionsPage";

const listStatementExtractions = vi.fn();
const getStatementExtraction = vi.fn();
let canRead = true;
let canRun = true;

vi.mock("./api", () => ({
  listStatementExtractions: (...args: unknown[]) =>
    listStatementExtractions(...args),
  getStatementExtraction: (...args: unknown[]) =>
    getStatementExtraction(...args),
  applyStatementExtraction: vi.fn(),
  rejectStatementExtraction: vi.fn(),
  rerunStatementExtraction: vi.fn(),
  getPreviewTransactions: (preview: Record<string, unknown>) => {
    const raw = preview.transactions;
    return Array.isArray(raw) ? raw : [];
  },
  readPreviewString: (preview: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const value = preview[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return undefined;
  },
  readPreviewNumber: () => undefined,
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "tenant-1",
  }),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: (permission: string) => {
    if (permission === "ai.documentExtract.read") {
      return canRead;
    }
    if (permission === "ai.documentExtract.run") {
      return canRun;
    }
    return false;
  },
}));

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

function renderPage(initialUrl = "/ai/statement-extractions") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route
            path="/ai/statement-extractions"
            element={<StatementExtractionsPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StatementExtractionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canRead = true;
    canRun = true;
    listStatementExtractions.mockResolvedValue({ items: [] });
  });

  it("renders empty state when there are no extractions awaiting review", async () => {
    renderPage();

    await waitFor(() => {
      expect(listStatementExtractions).toHaveBeenCalledWith({
        status: "awaitingReview",
      });
    });
    expect(
      await screen.findByTestId("statement-extractions-empty"),
    ).toBeInTheDocument();
  });

  it("renders forbidden when read permission is missing", async () => {
    canRead = false;
    renderPage();

    expect(
      await screen.findByText(/do not have permission/i),
    ).toBeInTheDocument();
    expect(listStatementExtractions).not.toHaveBeenCalled();
  });
});
