import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyEntityQueryFilterRoot } from "../../../components/entity/entity-query-filter-utils";
import type { EntityQueryDraftState } from "../use-entity-query-builder-editor";
import { TestEntityCatalogProvider } from "../../../test/test-entity-catalog-provider";

const mockEditorState = vi.hoisted(() => {
  const draft = {
    description: "Upcoming payments",
    queryMode: "records" as const,
    parameters: [],
    filter: {
      id: "filter-root",
      type: "group" as const,
      combinator: "and" as const,
      children: [],
    },
    sort: [],
    select: [],
    groupBy: [],
    aggregations: [],
    groupSort: [],
    limitMode: "topN" as const,
    limit: 20,
    status: "ACTIVE" as const,
  };

  const definition = {
    id: "entity_query_1",
    tenantId: "tenant_a",
    queryId: "upcoming_payments",
    name: "Upcoming payments",
    description: "Upcoming payments",
    sourceEntity: "payment",
    filter: {
      type: "group" as const,
      combinator: "and" as const,
      children: [],
    },
    sort: [],
    limitMode: "topN" as const,
    limit: 20,
    status: "ACTIVE" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    selectedDefinition: definition as typeof definition | null,
    draft: draft as EntityQueryDraftState | null,
    definitions: [definition] as (typeof definition)[],
  };
});

vi.mock("../entity-query-builder-context", () => ({
  useEntityQueryBuilder: () => ({
    editor: mockEditorState,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { EntityQueryPreviewPanel } from "./EntityQueryPreviewPanel";

function renderPanel() {
  return render(
    <TestEntityCatalogProvider items={[]}>
      <EntityQueryPreviewPanel />
    </TestEntityCatalogProvider>,
  );
}

describe("EntityQueryPreviewPanel", () => {
  it("renders the selected query overview", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    mockEditorState.draft = {
      description: "Upcoming payments",
      queryMode: "records",
      parameters: [],
      filter: createEmptyEntityQueryFilterRoot(),
      sort: [],
      select: [],
      groupBy: [],
      aggregations: [],
      groupSort: [],
      limitMode: "topN",
      limit: 20,
      status: "ACTIVE",
    };
    renderPanel();

    expect(
      screen.getByText("queryBuilder.howItWorks.panelTitle"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming payments").length).toBeGreaterThan(0);
    expect(
      screen.getByText("queryBuilder.howItWorks.records.source"),
    ).toBeInTheDocument();
  });

  it("shows empty message when no query is selected", () => {
    mockEditorState.selectedDefinition = null;
    mockEditorState.draft = null;
    renderPanel();

    expect(
      screen.getByText("queryBuilder.howItWorks.empty"),
    ).toBeInTheDocument();
  });

  it("switches to the advanced tab", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    mockEditorState.draft = {
      description: "Upcoming payments",
      queryMode: "records",
      parameters: [],
      filter: createEmptyEntityQueryFilterRoot(),
      sort: [],
      select: [],
      groupBy: [],
      aggregations: [],
      groupSort: [],
      limitMode: "topN",
      limit: 20,
      status: "ACTIVE",
    };
    renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "dataHooks.preview.tabs.advanced" }),
    );

    expect(
      screen.getByText("queryBuilder.howItWorks.advanced.title"),
    ).toBeInTheDocument();
  });
});
