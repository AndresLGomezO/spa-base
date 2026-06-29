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
  it("collects filter entries from view-filter components with qualified ids", () => {
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
                      id: "row-filter",
                      component: {
                        kind: "view-filter",
                        enableSearch: true,
                        enableFilters: true,
                        searchPlaceholder: "Search…",
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

    expect(collected.filterConfigs).toHaveLength(1);
    expect(collected.filterColumns.map((column) => column.id)).toEqual([
      "account.accountType",
    ]);
    expect(collected.catalogEntities).toEqual(["account"]);
    expect(collected.searchColumns.map((column) => column.id)).toEqual([
      "account.name",
    ]);
  });

  it("collects the first enabled date filter config", () => {
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
                  id: "row-filter",
                  component: {
                    kind: "view-filter",
                    enableDateFilter: true,
                    dateFilterGranularity: "month",
                    filters: [],
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
