import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import type { CustomViewRecord } from "../../lib/api-client";
import {
  applyCustomViewSelectionToSearchParams,
  getCustomViewSelectionId,
} from "./use-custom-views-editor";
import { useCustomViewsListQuery } from "./use-custom-views-list-query";

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

const sampleViews: CustomViewRecord[] = [
  {
    id: "cv_1",
    tenantId: "tenant_a",
    viewId: "upcoming-payments",
    name: "Upcoming payments",
    sourceEntity: "transaction",
    entityQueryDefinitionId: "query_1",
    nav: { label: "Payments" },
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
    name: "Paused view",
    sourceEntity: "account",
    entityQueryDefinitionId: "query_2",
    nav: { label: "Paused" },
    ui: {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      listViewType: "expandableTable",
    },
    status: "PAUSED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("custom view selection search params", () => {
  it("reads and writes the view selection param", () => {
    const params = new URLSearchParams("view=cv_1");
    expect(getCustomViewSelectionId(params)).toBe("cv_1");

    const cleared = applyCustomViewSelectionToSearchParams(params, "");
    expect(cleared.get("view")).toBeNull();

    const selected = applyCustomViewSelectionToSearchParams(params, "cv_2");
    expect(selected.get("view")).toBe("cv_2");
  });
});

describe("useCustomViewsListQuery", () => {
  it("filters by search and status", () => {
    const { result } = renderHook(
      () =>
        useCustomViewsListQuery(sampleViews, {
          query_1: "Payments query",
          query_2: "Accounts query",
        }),
      {
        wrapper: wrapper(["/?q=paused&status=PAUSED"]),
      },
    );

    expect(result.current.listViews).toHaveLength(1);
    expect(result.current.listViews[0]?.id).toBe("cv_2");
  });

  it("sorts by entity", () => {
    const { result } = renderHook(
      () => useCustomViewsListQuery(sampleViews, {}),
      {
        wrapper: wrapper(["/?sort=entity"]),
      },
    );

    expect(result.current.listViews.map((view) => view.sourceEntity)).toEqual([
      "account",
      "transaction",
    ]);
  });
});
