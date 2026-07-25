import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import type { AiContextSectionRecord } from "../../lib/api-client";
import { useUserAiContextListQuery } from "./use-user-ai-context-list-query";

function createSection(
  overrides: Partial<AiContextSectionRecord> &
    Pick<AiContextSectionRecord, "id" | "name">,
): AiContextSectionRecord {
  return {
    tenantId: "tenant-1",
    description: "",
    order: 0,
    enabled: true,
    scope: "perUser",
    visibility: {},
    blocks: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

const definitions = [
  createSection({
    id: "alpha",
    name: "Alpha section",
    order: 2,
    enabled: true,
    scope: "perUser",
    blocks: [
      {
        kind: "entityField",
        entityName: "deal",
        source: "singleton",
        field: "aiSummaryText",
      },
    ],
    updatedAt: "2026-01-03T00:00:00.000Z",
  }),
  createSection({
    id: "beta",
    name: "Beta section",
    order: 1,
    enabled: false,
    scope: "tenantWide",
    blocks: [{ kind: "staticMarkdown", content: "hello" }],
    updatedAt: "2026-01-01T00:00:00.000Z",
  }),
  createSection({
    id: "gamma",
    name: "Gamma",
    description: "special keyword",
    order: 3,
    enabled: true,
    scope: "perUser",
    blocks: [
      {
        kind: "metricValue",
        metricDefinitionId: "m1",
        format: "raw",
      },
    ],
    updatedAt: "2026-01-02T00:00:00.000Z",
  }),
];

function createWrapper(initialEntries = ["/settings/ai-context/sections"]) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };
}

describe("useUserAiContextListQuery", () => {
  it("filters by search, entity, blockKind, status, and scope", () => {
    const { result } = renderHook(
      () => useUserAiContextListQuery(definitions),
      {
        wrapper: createWrapper([
          "/settings/ai-context/sections?q=alpha&entity=deal&blockKind=entityField&status=enabled&scope=perUser",
        ]),
      },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "alpha",
    ]);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.activeFilterBadges.map((badge) => badge.id)).toEqual([
      "search",
      "entity:deal",
      "blockKind:entityField",
      "status:enabled",
      "scope:perUser",
    ]);
  });

  it("sorts by assembly order by default", () => {
    const { result } = renderHook(
      () => useUserAiContextListQuery(definitions),
      {
        wrapper: createWrapper(["/settings/ai-context/sections"]),
      },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "beta",
      "alpha",
      "gamma",
    ]);
  });

  it("sorts by recently updated descending", () => {
    const { result } = renderHook(
      () => useUserAiContextListQuery(definitions),
      {
        wrapper: createWrapper([
          "/settings/ai-context/sections?sort=updatedDesc",
        ]),
      },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "alpha",
      "gamma",
      "beta",
    ]);
  });

  it("updates URL when toggling filters", async () => {
    const { result } = renderHook(
      () => useUserAiContextListQuery(definitions),
      {
        wrapper: createWrapper(["/settings/ai-context/sections"]),
      },
    );

    result.current.toggleStatus("enabled");

    await waitFor(() => {
      expect(result.current.query.statuses).toEqual(["enabled"]);
    });
  });
});
