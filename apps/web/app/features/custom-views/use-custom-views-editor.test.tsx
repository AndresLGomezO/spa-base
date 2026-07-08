import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import type { ReactNode } from "react";

import type { CustomViewRecord } from "../../lib/api-client";
import { useCustomViewsEditor } from "./use-custom-views-editor";

const sampleViews: CustomViewRecord[] = [
  {
    id: "cv_1",
    tenantId: "tenant_a",
    viewId: "upcoming-payments",
    name: "Alpha view",
    sourceEntity: "transaction",
    entityQueryDefinitionId: "query_1",
    nav: { label: "Alpha" },
    ui: {
      views: [{ type: "table", name: "default", fields: ["type"] }],
      listViewType: "expandableTable",
    },
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "cv_2",
    tenantId: "tenant_a",
    viewId: "paused-view",
    name: "Beta view",
    sourceEntity: "account",
    entityQueryDefinitionId: "query_2",
    nav: { label: "Beta" },
    ui: {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      listViewType: "expandableTable",
    },
    status: "PAUSED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

vi.mock("../../custom-views/custom-view-catalog-context", () => ({
  useCustomViewCatalog: () => ({
    items: sampleViews,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getByViewId: vi.fn(),
  }),
}));

function wrapper(initialEntries: string[]) {
  return function RouterWrapper({
    children,
  }: {
    readonly children: ReactNode;
  }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };
}

function useEditorLocation() {
  const editor = useCustomViewsEditor();
  const location = useLocation();
  return { editor, location };
}

describe("useCustomViewsEditor", () => {
  it("auto-selects the first view when the selection param is missing", async () => {
    const { result } = renderHook(() => useEditorLocation(), {
      wrapper: wrapper(["/settings/custom-views"]),
    });

    await waitFor(() => {
      expect(result.current.location.search).toBe("?view=cv_1");
    });
    expect(result.current.editor.selectedId).toBe("cv_1");
    expect(result.current.editor.selectedView?.name).toBe("Alpha view");
  });

  it("keeps a valid selection param and syncs draft from the selected view", async () => {
    const { result } = renderHook(() => useEditorLocation(), {
      wrapper: wrapper(["/settings/custom-views?view=cv_2"]),
    });

    await waitFor(() => {
      expect(result.current.editor.selectedId).toBe("cv_2");
    });

    expect(result.current.editor.draft).toMatchObject({
      name: "Beta view",
      navLabel: "Beta",
      status: "PAUSED",
    });
    expect(result.current.editor.isDirty).toBe(false);
  });

  it("tracks dirty state when the draft changes", async () => {
    const { result } = renderHook(() => useCustomViewsEditor(), {
      wrapper: wrapper(["/settings/custom-views?view=cv_1"]),
    });

    await waitFor(() => {
      expect(result.current.selectedId).toBe("cv_1");
    });

    act(() => {
      result.current.updateDraft({ name: "Renamed view" });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("updates the selection param when setSelectedId is called", async () => {
    const { result } = renderHook(() => useEditorLocation(), {
      wrapper: wrapper(["/settings/custom-views?view=cv_1"]),
    });

    await waitFor(() => {
      expect(result.current.editor.selectedId).toBe("cv_1");
    });

    act(() => {
      result.current.editor.setSelectedId("cv_2");
    });

    await waitFor(() => {
      expect(result.current.location.search).toBe("?view=cv_2");
    });
    expect(result.current.editor.selectedView?.id).toBe("cv_2");
  });
});
