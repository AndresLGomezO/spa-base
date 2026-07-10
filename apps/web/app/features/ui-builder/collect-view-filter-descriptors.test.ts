import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { collectViewFilterDescriptors } from "./collect-view-filter-descriptors";

function createCatalogEntry(name: string): EntityCatalogEntry {
  return {
    name,
    fields: {
      accountType: { type: "enum" },
      name: { type: "string" },
    },
    ui: {
      views: [
        { type: "table", name: "default", fields: ["name", "accountType"] },
      ],
      fields: {
        accountType: { filterable: true },
        name: { searchable: true },
      },
    },
  } as unknown as EntityCatalogEntry;
}

describe("collectViewFilterDescriptors", () => {
  it("collects filter entries from view-filters components with qualified ids", () => {
    const collected = collectViewFilterDescriptors({
      catalog: [createCatalogEntry("account")],
      sections: [
        {
          id: "section-1",
          name: "Overview",
          layout: {
            showActions: true,
            root: {
              type: "root",
              id: "root-1",
              columnCount: 1,
              columns: [
                {
                  id: "col-1",
                  rows: [
                    {
                      type: "component",
                      id: "row-search",
                      component: {
                        kind: "view-search",
                        placeholder: "Search…",
                      },
                    },
                    {
                      type: "component",
                      id: "row-filters",
                      component: {
                        kind: "view-filters",
                        filters: [
                          { entityName: "account", fieldName: "accountType" },
                        ],
                      },
                    },
                    {
                      type: "component",
                      id: "row-widget",
                      component: {
                        kind: "metric-widget",
                        entityName: "account",
                        widgetId: "widget-1",
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      dashboardLayout: {
        showActions: true,
        root: {
          type: "root",
          id: "root-dashboard",
          columnCount: 1,
          columns: [
            {
              id: "col-dashboard",
              rows: [
                {
                  type: "component",
                  id: "row-section",
                  component: {
                    kind: "dashboard-section",
                    sectionId: "section-1",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(collected.hasSearch).toBe(true);
    expect(collected.filterConfigs).toHaveLength(1);
    expect(collected.filterColumns.map((column) => column.id)).toEqual([
      "account.accountType",
    ]);
    expect(collected.catalogEntities).toEqual(["account"]);
    expect(collected.searchColumns.map((column) => column.id)).toEqual([
      "account.name",
    ]);
  });

  it("does not build search columns when no view-search component exists", () => {
    const collected = collectViewFilterDescriptors({
      catalog: [createCatalogEntry("account")],
      sections: [],
      dashboardLayout: {
        showActions: true,
        root: {
          type: "root",
          id: "root-dashboard",
          columnCount: 1,
          columns: [
            {
              id: "col-dashboard",
              rows: [
                {
                  type: "component",
                  id: "row-filters",
                  component: {
                    kind: "view-filters",
                    filters: [
                      { entityName: "account", fieldName: "accountType" },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(collected.hasSearch).toBe(false);
    expect(collected.searchColumns).toEqual([]);
  });

  it("collects the first view-date-filter config", () => {
    const collected = collectViewFilterDescriptors({
      catalog: [createCatalogEntry("account")],
      sections: [],
      dashboardLayout: {
        showActions: true,
        root: {
          type: "root",
          id: "root-dashboard",
          columnCount: 1,
          columns: [
            {
              id: "col-dashboard",
              rows: [
                {
                  type: "component",
                  id: "row-date-filter",
                  component: {
                    kind: "view-date-filter",
                    dateFilterGranularity: "month",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    expect(collected.dateFilterConfig).toEqual({
      param: "month",
      granularity: "month",
    });
  });
});
