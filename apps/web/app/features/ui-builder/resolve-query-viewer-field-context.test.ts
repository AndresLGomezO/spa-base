import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client";
import {
  findEnclosingQueryViewerConfig,
  isInsideQueryViewerTemplate,
  resolveQueryViewerSourceDefinition,
} from "./resolve-query-viewer-field-context";

function createCatalogEntry(name: string): EntityCatalogEntry {
  return {
    name,
    fields: {
      name: { type: "string" },
      logo: { type: "image" },
    },
    ui: {
      views: [{ type: "table", name: "default", fields: ["name"] }],
    },
  } as unknown as EntityCatalogEntry;
}

function createLayoutWithQueryViewer(
  entityQueryDefinitionId: string,
  templateRowId = "template-text",
) {
  return {
    root: {
      type: "root" as const,
      id: "root-1",
      columnCount: 1,
      columns: [
        {
          id: "col-1",
          rows: [
            {
              type: "component" as const,
              id: "query-viewer-row",
              component: {
                kind: "query-viewer" as const,
                entityQueryDefinitionId,
                rows: [
                  {
                    type: "component" as const,
                    id: templateRowId,
                    component: {
                      kind: "text" as const,
                      primary: { type: "field" as const, path: "name" },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

describe("resolve-query-viewer-field-context", () => {
  const account = createCatalogEntry("account");
  const catalog = [account];

  const queryDefinitions: readonly EntityQueryDefinitionRecord[] = [
    {
      id: "query-def-1",
      tenantId: "tenant-1",
      queryId: "q1",
      name: "Active accounts",
      sourceEntity: "account",
      filter: { type: "group", combinator: "and", children: [] },
      sort: [],
      limitMode: "topN",
      limit: 10,
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const layout = createLayoutWithQueryViewer("query-def-1");

  it("detects rows inside a query-viewer template", () => {
    expect(isInsideQueryViewerTemplate(layout, "template-text")).toBe(true);
    expect(isInsideQueryViewerTemplate(layout, "query-viewer-row")).toBe(true);
    expect(isInsideQueryViewerTemplate(layout, "missing-row")).toBe(false);
  });

  it("finds enclosing query-viewer config for template rows", () => {
    const config = findEnclosingQueryViewerConfig(layout, "template-text");
    expect(config?.entityQueryDefinitionId).toBe("query-def-1");
  });

  it("resolves source entity definition for template rows", () => {
    const resolved = resolveQueryViewerSourceDefinition(
      layout,
      "template-text",
      queryDefinitions,
      catalog,
    );

    expect(resolved?.name).toBe("account");
  });

  it("returns null when query is not configured on the query-viewer", () => {
    const unconfiguredLayout = createLayoutWithQueryViewer("");

    expect(
      resolveQueryViewerSourceDefinition(
        unconfiguredLayout,
        "template-text",
        queryDefinitions,
        catalog,
      ),
    ).toBeNull();
  });
});
