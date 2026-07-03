import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import type { FormulaDefinitionRecord } from "../../lib/api-client";
import { useFormulasListQuery } from "./use-formulas-list-query";

function createDefinition(
  overrides: Partial<FormulaDefinitionRecord> & Pick<FormulaDefinitionRecord, "id" | "name">,
): FormulaDefinitionRecord {
  return {
    tenantId: "tenant-1",
    description: "",
    inputs: [],
    body: { type: "literal", value: 1 },
    enabled: true,
    source: "tenant",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

const definitions = [
  createDefinition({
    id: "alpha",
    name: "Alpha Formula",
    source: "platform",
    enabled: true,
    updatedAt: "2026-01-03T00:00:00.000Z",
  }),
  createDefinition({
    id: "beta",
    name: "Beta Formula",
    source: "tenant",
    enabled: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }),
  createDefinition({
    id: "gamma",
    name: "Gamma",
    description: "special keyword",
    source: "tenant",
    enabled: true,
    updatedAt: "2026-01-02T00:00:00.000Z",
  }),
];

function createWrapper(initialEntries = ["/settings/formulas"]) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };
}

describe("useFormulasListQuery", () => {
  it("filters by search, source, and status", () => {
    const { result } = renderHook(
      () => useFormulasListQuery(definitions),
      {
        wrapper: createWrapper([
          "/settings/formulas?q=alpha&source=platform&status=enabled",
        ]),
      },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "alpha",
    ]);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.activeFilterBadges.map((badge) => badge.id)).toEqual([
      "search",
      "source:platform",
      "status:enabled",
    ]);
  });

  it("sorts by recently updated descending", () => {
    const { result } = renderHook(
      () => useFormulasListQuery(definitions),
      { wrapper: createWrapper(["/settings/formulas?sort=updatedDesc"]) },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "alpha",
      "gamma",
      "beta",
    ]);
    expect(result.current.activeFilterBadges).toEqual([
      expect.objectContaining({ id: "sort", label: "updatedDesc" }),
    ]);
  });

  it("updates URL when toggling filters", async () => {
    const { result } = renderHook(
      () => useFormulasListQuery(definitions),
      { wrapper: createWrapper(["/settings/formulas"]) },
    );

    result.current.toggleSource("tenant");

    await waitFor(() => {
      expect(result.current.query.sources).toEqual(["tenant"]);
    });

    result.current.clearFilters();

    await waitFor(() => {
      expect(result.current.query.sources).toEqual([]);
      expect(result.current.query.search).toBe("");
      expect(result.current.query.sort).toBe("nameAsc");
    });
  });

  it("computes source and status counts on filtered set", () => {
    const { result } = renderHook(
      () => useFormulasListQuery(definitions),
      { wrapper: createWrapper(["/settings/formulas?source=tenant"]) },
    );

    expect(result.current.sourceCounts).toEqual({ tenant: 2 });
    expect(result.current.statusCounts).toEqual({ enabled: 1, disabled: 1 });
  });

  it("matches search against id and description", () => {
    const { result } = renderHook(
      () => useFormulasListQuery(definitions),
      { wrapper: createWrapper(["/settings/formulas?q=special"]) },
    );

    expect(result.current.listDefinitions.map((entry) => entry.id)).toEqual([
      "gamma",
    ]);
  });
});
